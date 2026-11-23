#!/usr/bin/env python3
"""Process the Biceek Script Lab queue on EC2 using the existing Codex login."""

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import tempfile
from threading import Event, Lock
import time
import unicodedata
import urllib.request
import uuid
import xml.etree.ElementTree as ET


def sql_literal(value):
    encoded = value.encode().hex()
    return f"convert_from(decode('{encoded}', 'hex'), 'UTF8')"


def database(sql):
    result = subprocess.run(
        ["psql", "-X", "-Aqt", "-v", "ON_ERROR_STOP=1", "-d", "emw3_script_lab"],
        input=sql, text=True, capture_output=True, check=True, timeout=15,
    )
    return [json.loads(line) for line in result.stdout.splitlines() if line.strip()]


def claim():
    lease = str(uuid.uuid4())
    try:
        rows = database(f"""
          BEGIN;
          SELECT pg_advisory_xact_lock(60419, 20261120);
          UPDATE script_lab.video_jobs SET status='failed', stage='failed', error_code='worker_timeout',
            finished_at=now(), events=events || jsonb_build_array(jsonb_build_object('at',now(),'stage','failed'))
            WHERE project_slug='biceek' AND status='running' AND heartbeat_at < now() - interval '20 minutes';
          WITH next_job AS (
            SELECT id FROM script_lab.video_jobs
            WHERE project_slug='biceek' AND status='queued'
              AND NOT EXISTS (SELECT 1 FROM script_lab.video_jobs WHERE project_slug='biceek' AND status='running')
            ORDER BY submitted_at,id LIMIT 1 FOR UPDATE SKIP LOCKED
          ), updated AS (
            UPDATE script_lab.video_jobs j SET status='running', stage='validating', lease_id='{lease}'::uuid,
              started_at=now(), heartbeat_at=now(),
              events=events || jsonb_build_array(jsonb_build_object('at',now(),'stage','validating','processed',0))
            FROM next_job WHERE j.id=next_job.id RETURNING j.id,j.lease_id,j.payload
          ) SELECT row_to_json(updated) FROM updated;
          COMMIT;
        """)
        return rows[0] if rows else None
    except subprocess.CalledProcessError as exc:
        raise RuntimeError("Database claim failed") from exc


class JobCancelled(Exception):
    pass


def job_cancelled(job):
    return bool(database(f"""
      SELECT 'true'::jsonb FROM script_lab.video_jobs
      WHERE id='{uuid.UUID(job["id"])}'::uuid AND status='cancelled'
    """))


def update(job, stage, processed, *, result=None, error=None, reason=None, item_no=None):
    final = stage in {"completed", "failed"}
    status = stage if final else "running"
    event_reason = f",'reason',{sql_literal(reason)}" if reason else ""
    event_item = f",'item_no',{item_no}" if item_no is not None else ""
    extra = ""
    if final:
        extra = ", finished_at=now(), result=" + (sql_literal(json.dumps(result, ensure_ascii=False)) + "::jsonb" if result else "NULL")
        extra += ", error_code=" + (sql_literal(error) if error else "NULL")
    rows = database(f"""
      WITH updated AS (
        UPDATE script_lab.video_jobs SET status='{status}', stage='{stage}', processed=greatest(processed,{processed}), heartbeat_at=now(),
          events=events || jsonb_build_array(jsonb_build_object('at',now(),'stage','{stage}','processed',greatest(processed,{processed}){event_reason}{event_item}))
          {extra}
        WHERE id='{uuid.UUID(job["id"])}'::uuid AND lease_id='{uuid.UUID(job["lease_id"])}'::uuid AND status='running'
        RETURNING id
      ) SELECT row_to_json(updated) FROM updated;
    """)
    if not rows:
        if job_cancelled(job):
            raise JobCancelled()
        raise RuntimeError("Queue lease expired")


def codes(value):
    return {entry.strip() for entry in (value or "").split(",") if entry.strip()}


def prepare_combination(item, payload):
    elements = item["selected_elements"]
    explicit = {element["dimension_code"]: element["value_code"] for element in elements}
    if len(elements) != len(explicit):
        raise ValueError("duplicate_dimension")
    rules = payload["rules"]
    lookup = {(rule["dimension"], rule["code"]): rule for rule in rules["variables"]}
    dimensions = {dimension["code"]:dimension for dimension in rules["dimensions"]}
    active = rules["active_constraints"]
    forbidden = {rule["code"] for rule in active if rule["dimension"] == "FORBID"}
    blocked = {"disabled", "unverified"} | ({"caution"} if "F_STATUS" in forbidden else set())
    config = (payload.get("baseline_script") or {}).get("configuration") or ""
    baseline = dict(pair.strip().split("=", 1) for pair in config.split(",") if "=" in pair)
    settings = {element["dimension_code"]:element["value_code"] for element in payload["selected_elements"]
                if element["dimension_code"] in {"ROUND","WAVE"}}
    if "F_SINGLE" in forbidden and baseline and settings.get("ROUND"):
        round_rule = lookup.get(("ROUND",settings["ROUND"])) or {}
        allowed_changes = codes(round_rule.get("fields", {}).get("dims")) | {
            element["value_code"] for element in payload["selected_elements"] if element["dimension_code"] == "VARY"
        }
        changes = {axis for axis,value in explicit.items() if axis in baseline and baseline[axis] != value}
        if len(changes) > 1 or changes - allowed_changes:
            raise ValueError("single_variable_constraint")

    chosen = dict(explicit)
    matched = next((rule for rule in active if (rule["dimension"], rule["code"]) == ("RULE", explicit.get("PAIN",baseline.get("PAIN")))), None)
    mappings = {axis: list(filter(None, (matched or {}).get("fields",{}).get(field,"").replace(" ","").split(",")))
                for axis, field in {"BEN":"ben", "EVD":"ev", "HK":"hk", "SCN":"scn"}.items()}

    def resolve(axis, options):
        options = [code for code in options if (axis,code) in lookup and lookup[(axis,code)]["status"] not in blocked]
        if axis in explicit and options and chosen[axis] not in options:
            raise ValueError("pain_matching")
        if axis not in chosen and options:
            chosen[axis] = baseline[axis] if baseline.get(axis) in options else options[0]

    resolve("BEN", mappings["BEN"])
    evidence = next((rule for rule in active if (rule["dimension"], rule["code"]) == ("BEV", chosen.get("BEN",baseline.get("BEN")))), None)
    evidence_options = (evidence or {}).get("fields",{}).get("ev","").split(",") if evidence else []
    if evidence_options and mappings["EVD"]:
        compatible = [value for value in mappings["EVD"] if value in evidence_options]
        if not compatible:
            raise ValueError("selling_point_evidence")
        resolve("EVD",compatible)
    else:
        resolve("EVD",mappings["EVD"] or evidence_options)
    resolve("HK",mappings["HK"])
    resolve("SCN",mappings["SCN"])
    for axis, code in baseline.items():
        if axis in dimensions and dimensions[axis]["layer"] in {"strategy","creative","execution"}:
            variable = lookup.get((axis,code))
            if variable and variable["status"] not in blocked:
                chosen.setdefault(axis,code)
    for axis, code in chosen.items():
        variable = lookup.get((axis,code))
        if not variable or variable["status"] in blocked:
            raise ValueError("invalid_variable")
        if "F_WAVE2" in forbidden and variable["status"] == "phase-two" and settings.get("WAVE") != "W2":
            raise ValueError("second_wave_required")
    if "F_H07" in forbidden and chosen.get("HK") == "H07" and chosen.get("CAST") != "TECH":
        raise ValueError("expert_cast")
    if "F_CTA" in forbidden and chosen.get("CTA") and chosen.get("FUN") and chosen["CTA"] not in {
            "AW":{"LM","FIND"}, "CON":{"SHW","CHK"}, "CV":{"CHK"}}.get(chosen["FUN"], {chosen["CTA"]}):
        raise ValueError("funnel_cta")
    if "F_LEN" in forbidden and chosen.get("FUN") and (
            chosen.get("LEN") == "L15" and chosen["FUN"] != "AW"
            or chosen.get("LEN") in {"L45","L60"} and chosen["FUN"] != "CV"):
        raise ValueError("funnel_duration")
    if "F_HOME" in forbidden and chosen.get("SCN") in {"HOME","STORE"} and chosen.get("BEN") not in {None,"HIDE","INST"}:
        raise ValueError("scene_selling_point")
    if "F_FOMO" in forbidden and chosen.get("PAIN") == "LOST" and (chosen.get("HK") == "FOMO" or chosen.get("MOOD") == "URGENT"):
        raise ValueError("fomo_constraint")
    market_languages = {"DE":{"DE"},"NL":{"NL"},"FR":{"FR"},"EN":{"EN"},"CH":{"DE","FR","IT"},"ES":{"ES"},"IT":{"IT"}}
    if "F_LANG" in forbidden and chosen.get("LANG") and chosen.get("MKT") in market_languages:
        if chosen["LANG"] not in market_languages[chosen["MKT"]]:
            raise ValueError("market_language")
    resolved = [{ "dimension_code":axis,"value_code":code,"label":lookup[(axis,code)]["label"],
                  "layer_code":dimensions[axis]["layer"] } for axis,code in chosen.items() if axis not in explicit]
    return chosen, {**item,"resolved_elements":resolved}


def normalize(text):
    return " ".join(unicodedata.normalize("NFKC", text).casefold().split())


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for element in value.values():
            yield from strings(element)
    elif isinstance(value, list):
        for element in value:
            yield from strings(element)


def prohibited_terms(output, rules):
    texts = [normalize(value) for value in strings(output)]
    matches = []
    for rule in rules:
        if rule["dimension"] != "BAN":
            continue
        term = normalize(rule["code"])
        if not term:
            continue
        rule_pattern = re.escape(term)
        if "LATIN" in unicodedata.name(term[0], ""):
            rule_pattern = r"(?<![^\W_])" + rule_pattern
        if "LATIN" in unicodedata.name(term[-1], ""):
            rule_pattern += r"(?![^\W_])"
        allowed = [normalize(x) for x in rule.get("fields", {}).get("exc", "").split(";") if x.strip()]
        for text in texts:
            for exception in allowed:
                text = text.replace(exception, " ")
            if re.search(rule_pattern, text):
                matches.append(rule["code"])
                break
    return matches


def google_trends(market):
    code = {"DE":"DE", "NL":"NL", "FR":"FR", "EN":"GB", "CH":"CH", "ES":"ES", "IT":"IT"}.get(market)
    if not code:
        return {"status":"market_unavailable"}
    url = f"https://trends.google.com/trending/rss?geo={code}"
    now = datetime.now(timezone.utc)
    try:
        with urllib.request.urlopen(url, timeout=12) as response:
            entries = ET.fromstring(response.read(1_000_000)).findall("./channel/item")
        results = []
        for entry in entries:
            stamp = parsedate_to_datetime(entry.findtext("pubDate"))
            if now - timedelta(hours=24) <= stamp <= now:
                results.append({"query":entry.findtext("title"), "published_at":stamp.isoformat()})
        return {"status":"ok", "source":url, "fetched_at":now.isoformat(), "market":code, "items":results}
    except (OSError, ValueError, TypeError, ET.ParseError):
        return {"status":"source_unavailable", "source":url, "market":code, "fetched_at":now.isoformat()}


def obj(**properties):
    return {"type":"object","additionalProperties":False,"properties":properties,"required":list(properties)}


def array(element):
    return {"type":"array","items":element}


STRING = {"type":"string"}
PAIR = array(STRING) | {"minItems":2,"maxItems":2}
LOGIC = obj(context=PAIR, proof=PAIR, check=PAIR)
SCRIPT_SCHEMA = obj(title=PAIR, copy=obj(hook=PAIR, body=PAIR, cta=PAIR), rationale=LOGIC)
STORYBOARD_SCHEMA = obj(scenes=array(obj(
    recommendedSeconds={"type":"integer","minimum":1}, visual=PAIR, voiceover=STRING, translation=STRING,
    subtitle=STRING, subtitleTranslation=STRING, visualPrompt=STRING, purpose=PAIR,
)), logic=LOGIC)
LANGUAGE = {"DE":"de", "NL":"nl", "FR":"fr", "EN":"en", "CH":"de", "ES":"es", "IT":"it"}
AUDIT_SCHEMA = obj(checks=array(obj(
    check_id=STRING, rule_id={"type":["string","null"]},
    status={"type":"string","enum":["passed","failed","needs_verification","not_applicable"]},
    field_path={"type":["string","null"]}, shot_no={"type":["integer","null"]},
    note=STRING, evidence_refs=array(STRING),
)))


def infer(job, workdir, prompt, context, schema, *, effort="medium"):
    if job["stop"].is_set():
        raise JobCancelled()
    with tempfile.TemporaryDirectory(prefix="script-lab-video-") as temporary:
        folder = Path(temporary)
        target = folder / "output.json"
        contract = folder / "schema.json"
        contract.write_text(json.dumps(schema), encoding="utf-8")
        task = prompt + "\n\n本轮仅处理输入中的一个条目。JSON Schema 优先于提示词里旧批次外层字段。selected_elements 和 resolved_elements 都由运行器决定，不增减或修改。分镜以 recommendedSeconds 提供每镜的建议时长。运行器会按比重换算到 target_duration_seconds，只调整时间标记。每镜填写台词、独立字幕及画面提示词，无台词或字幕用空字符串。成对文案按 [目标语言原文, 中文]；标题、逻辑、画面和镜头用途按 [英文, 中文]。excellent_examples 仅参考创意表达、节奏和证据呈现，不照抄，不覆盖当前组合、规则或事实。不得输出源码、内部路径或私密资料。没有证据的参考来源明确标缺失。\n\n本次只读输入：\n" + json.dumps(context, ensure_ascii=False)
        command = ["codex", "-a", "never", "exec", "--model", "gpt-6.2-sol",
                   "-c", f'model_reasoning_effort="{effort}"', "--ephemeral", "--sandbox", "read-only",
                   "--skip-git-repo-check", "--output-schema", str(contract), "--output-last-message", str(target), "-"]
        deadline = time.monotonic() + 360
        with subprocess.Popen(command, cwd=workdir, stdin=subprocess.PIPE, text=True,
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True) as process:
            try:
                while True:
                    try:
                        process.communicate(input=task, timeout=3)
                        break
                    except subprocess.TimeoutExpired:
                        task = None
                        if job["stop"].is_set() or job_cancelled(job):
                            raise JobCancelled()
                        if time.monotonic() >= deadline:
                            raise subprocess.TimeoutExpired(command, 360)
            finally:
                if process.poll() is None:
                    try:
                        os.killpg(process.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
            if process.returncode:
                raise subprocess.CalledProcessError(process.returncode, command)
        return json.loads(target.read_text(encoding="utf-8"))


def digest(data):
    return hashlib.sha256(json.dumps(data, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def combination_elements(item, payload):
    dimensions = {rule["code"]: rule["label"] for rule in payload["rules"]["dimensions"]}
    labels = {(rule["dimension"], rule["code"]): (rule.get("label_en") or rule["label"], rule["label"])
              for rule in payload["rules"]["variables"]}
    return [{"key":value["dimension_code"], "code":value["value_code"],
             "name":dimensions[value["dimension_code"]], "label":labels[(value["dimension_code"],value["value_code"])]}
            for value in item["selected_elements"] + item.get("resolved_elements",[])]


def storyboard_approved(item):
    approval_id = item.get("approval_id")
    if not isinstance(approval_id, str) or not approval_id.isdecimal():
        return False
    rows = database(f"""
      SELECT row_to_json(r) FROM (
        SELECT id::text, decision FROM script_lab.script_reviews
        WHERE project_slug='biceek' AND batch_id={sql_literal(item['source_script_batch_id'])}
          AND script_id={sql_literal(item['script_id'])} AND script_revision={sql_literal(item['script_revision'])}
        ORDER BY id DESC LIMIT 1
      ) r;
    """)
    return bool(rows and rows[0] == {"id":approval_id,"decision":"approved"})


def storyboard_duration(item):
    selection = {element["key"]:element["code"] for element in item["script"]["combination"]}
    expected = selection.get("LEN", "L30")
    return int(expected[1:]) if re.fullmatch(r"L[0-9]+", expected) else 30


def assign_storyboard_times(artifact, duration):
    scenes = artifact["scenes"]
    if not 1 <= len(scenes) <= duration:
        raise ValueError("shot_timing")
    weights = [max(1, scene["recommendedSeconds"]) for scene in scenes]
    remaining = duration - len(scenes)
    total_weight = sum(weights)
    end = 0
    cumulative = 0
    for index, (scene, weight) in enumerate(zip(scenes, weights)):
        cumulative += weight
        stop = index + 1 + remaining * cumulative // total_weight
        scene.update(startSeconds=end, endSeconds=stop, time=f"{end}–{stop}s")
        end = stop


PATCH_SCHEMA = obj(edits=array(obj(path=STRING, value=STRING)))


def text_fields(value, path=""):
    if isinstance(value, dict):
        for key, child in value.items():
            if isinstance(child, str):
                yield f"{path}/{key}", (value, key)
            else:
                yield from text_fields(child, f"{path}/{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            if isinstance(child, str):
                yield f"{path}/{index}", (value, index)
            else:
                yield from text_fields(child, f"{path}/{index}")


def editable_fields(artifacts):
    return {path: field for path, field in text_fields(artifacts)
            if path.rsplit("/", 1)[-1] not in {"language", "time"}}


def apply_text_patch(fields, issues, edits):
    changes = {entry["path"]: entry["value"] for entry in edits}
    if (len(changes) != len(edits) or set(changes) != set(issues)
            or any(path not in fields or not isinstance(value, str) for path, value in changes.items())):
        raise ValueError("invalid_patch")
    for path, value in changes.items():
        parent, key = fields[path]
        parent[key] = value


def repair_fields(job, workdir, context, artifacts, issues):
    fields = editable_fields(artifacts)
    patch = infer(job, workdir,
        "按明确列出的字段路径局部修正。每个路径只返回一个替换后的字符串。"
        "保持原语言、语义和已选变量，保持其他字段及镜头顺序，不补写无证据的事实。"
        "台词和翻译各有独立路径。严格只提交 issues 列出的字段。",
        {"target_language":context["target_language"], "rules":context["rules"]["active_constraints"],
         "artifacts":artifacts, "issues":issues}, PATCH_SCHEMA, effort="low")
    apply_text_patch(fields, issues, patch["edits"])


def repair_prohibited_terms(job, workdir, context, artifacts):
    rules = context["rules"]["active_constraints"]
    if not prohibited_terms(artifacts, rules):
        return
    issues = {path: matches for path, (parent, key) in editable_fields(artifacts).items()
              if (matches := prohibited_terms(parent[key], rules))}
    if issues:
        repair_fields(job, workdir, context, artifacts, issues)
    if prohibited_terms(artifacts, rules):
        raise ValueError("prohibited_terms")


def audit_context(context):
    item = context["items"][0]
    rules = context["rules"]
    elements = {key: item[key] for key in ("selected_elements", "resolved_elements") if key in item}
    codes = {(entry["dimension_code"], entry["value_code"])
             for entries in elements.values() for entry in entries}
    return {
        "project_name":context["project_name"], "product_name":context.get("product_name"),
        "rule_version":context["rule_version"], "target_language":context["target_language"],
        "combination":elements, "active_constraints":rules["active_constraints"],
        "selected_variables":[rule for rule in rules.get("variables", [])
                              if (rule["dimension"], rule["code"]) in codes],
        "approved_script":item.get("script"),
        "project_evidence":context.get("project_evidence"),
    }


def affected_checks(checks, changed_paths):
    # Recheck both languages of a script field, all checks on an affected shot,
    # and global checks such as claims or consistency across artifacts.
    def scope(path):
        return "/".join(path.split("/")[:4])

    scopes = {scope(path) for path in changed_paths}
    return [entry for entry in checks if not entry["field_path"]
            or entry["status"] == "failed"
            or scope(entry["field_path"]) in scopes]


def audit_artifacts(job, workdir, prompt, context, artifacts, progress):
    fields = editable_fields(artifacts)
    instruction = (
        "\n本批以 artifacts 为唯一自检目标，本段覆盖旧提示的分开自检和回传格式。"
        "覆盖其中所有剧本和分镜，按 JSON Schema 只返回一份 checks，报告版本与标识由运行器填写。"
        "每项 check_id 在本报告唯一，复检同一检查项使用相同 ID。"
        "可通过改写解决的 failed 检查，field_path 必须逐字取自 editable_paths，"
        "每个受影响的关联字段单独记录（例如同一台词的翻译及分镜字幕）。路径下标从 0 开始，shot_no 从 1 开始。"
        "不能通过改写解决的检查保留 failed 或 needs_verification 状态，不虚构证据。"
    )
    validator = {"prohibited_terms":[]}
    if board := artifacts.get("storyboard"):
        validator["storyboard_duration_seconds"] = board["scenes"][-1]["endSeconds"]
    request = {**audit_context(context), "artifacts":artifacts, "editable_paths":list(fields), "validator":validator}
    progress("checking")
    checks = infer(job, workdir, prompt + instruction, request, AUDIT_SCHEMA, effort="low")["checks"]
    if not checks or len({entry["check_id"] for entry in checks}) != len(checks):
        raise ValueError("self_check_unavailable")

    issues = {}
    for entry in checks:
        path = entry["field_path"]
        if entry["status"] == "failed" and path in fields:
            issues.setdefault(path, []).append({"rule_id":entry["rule_id"], "note":entry["note"]})
    if not issues:
        return checks
    snapshot = {path: parent[key] for path, (parent, key) in fields.items() if path in issues}
    try:
        progress("revising")
        repair_fields(job, workdir, context, artifacts, issues)
        if prohibited_terms(artifacts, context["rules"]["active_constraints"]):
            raise ValueError("prohibited_terms")
        progress("checking")
        affected = affected_checks(checks, issues)
        revised = infer(job, workdir, prompt + instruction +
                        "\n本次仅复检 recheck 里的检查项和修改引入的新问题。原检查项照用其 ID，"
                        "未列出的检查项不重做；新的问题使用新 ID。",
                        {**request, "revised_paths":list(issues), "recheck":affected}, AUDIT_SCHEMA, effort="low")["checks"]
        revised_by_id = {entry["check_id"]:entry for entry in revised}
        unaffected_ids = {entry["check_id"] for entry in checks} - {entry["check_id"] for entry in affected}
        if (len(revised_by_id) != len(revised) or unaffected_ids.intersection(revised_by_id)
                or not {entry["check_id"] for entry in affected} <= revised_by_id.keys()):
            raise ValueError("self_check_unavailable")
        report = [revised_by_id.pop(entry["check_id"], entry) for entry in checks]
        return report + list(revised_by_id.values())
    except (OSError, ValueError, KeyError, subprocess.SubprocessError):
        for path, value in snapshot.items():
            parent, key = fields[path]
            parent[key] = value
        return checks


def generate_integrated_storyboard(job, workdir, prompt, context, item, script, progress):
    duration = storyboard_duration({"script":script})
    request = {**context, "mode":"storyboard", "target_duration_seconds":duration,
               "items":[{"item_id":item["item_id"], "script_id":script["id"],
                         "script_revision":script["revision"], "script":script}]}
    progress("storyboarding")
    artifact = infer(job, workdir, prompt, request, STORYBOARD_SCHEMA)
    repair_prohibited_terms(job, workdir, context, {"storyboard":artifact})
    assign_storyboard_times(artifact, duration)
    artifact["language"] = script["language"]
    return artifact


def run_job(job, workdir):
    payload = job["payload"]
    script_mode = payload["mode"] == "script"
    prompt = (workdir / ("PROMPT.md" if script_mode else "STORYBOARD_PROMPT.md")).read_text(encoding="utf-8")
    audit_prompt = (workdir / "COMPLIANCE_SELF_CHECK_PROMPT.md").read_text(encoding="utf-8")
    if payload["project_name"] != "Biceek" or len(payload["items"]) != payload["output_count"]:
        raise ValueError("invalid_request")
    auto_storyboard = script_mode and payload.get("include_storyboard", True) is True
    if auto_storyboard:
        prompt += "\n本轮先写剧本，运行器随后自动生成分镜，无需等待人工审核。"
        board_prompt = (workdir / "STORYBOARD_PROMPT.md").read_text(encoding="utf-8") + (
            "\n本轮由同批自动触发。使用输入中刚生成并完成程序检查的剧本快照，"
            "本轮没有人工审核记录，不要要求 approval_id，也不要声称人工通过。"
        )
    job = {**job, "stop": Event()}
    references = {}
    reference_lock = Lock()
    progress_lock = Lock()
    processed = 0

    def load_reference(market):
        with reference_lock:
            if market not in references:
                references[market] = google_trends(market)

    def record(stage, index, *, finished=False, reason=None):
        nonlocal processed
        with progress_lock:
            if job["stop"].is_set():
                raise JobCancelled()
            if finished:
                processed += 1
            try:
                update(job, stage, processed, item_no=index + 1, reason=reason)
            except Exception:
                job["stop"].set()
                raise

    def process_item(index, item):
        def progress(stage):
            record(stage, index)

        output = {"scripts":[], "storyboards":[], "errors":[]}
        rejected = None
        try:
            progress("validating")
            if script_mode:
                values, item = prepare_combination(item, payload)
                market = values.get("MKT")
                language = LANGUAGE.get(values.get("LANG", market), "en")
                progress("researching")
                load_reference(market)
            else:
                if not storyboard_approved(item):
                    raise ValueError("approval_changed")
                market = None
                language = item["script"].get("language", "de")
            context = {**payload, "items":[item], "output_count":1, "target_language":language, "references":{
                "google_trends":references.get(market), "instagram":"unavailable", "tiktok_details":"unavailable",
                "project_context":"Use the supplied baseline and rule evidence; unverified facts must stay pending.",
            }}
            if not script_mode:
                context["target_duration_seconds"] = storyboard_duration(item)
            kind = payload["mode"]
            progress("generating")
            artifact = infer(job, workdir, prompt, context, SCRIPT_SCHEMA if script_mode else STORYBOARD_SCHEMA)
            artifacts = {kind:artifact}
            repair_prohibited_terms(job, workdir, context, artifacts)
            artifact_id = f'{payload["batch_id"]}-{index + 1}'
            board = None
            if script_mode:
                script = {"id":artifact_id, "revision":digest(artifact), "pain":artifact["title"], "language":language,
                          "combination":combination_elements(item,payload), "copy":artifact["copy"], "rationale":artifact["rationale"]}
                if auto_storyboard:
                    try:
                        board = generate_integrated_storyboard(job, workdir, board_prompt, context, item, script, progress)
                        artifacts["storyboard"] = board
                    except (OSError, ValueError, KeyError, subprocess.SubprocessError):
                        output["errors"].append({"item_id":item["item_id"],"code":"storyboard_failed"})
            else:
                assign_storyboard_times(artifact, context["target_duration_seconds"])
                artifact["language"] = language
            checks = None
            try:
                checks = audit_artifacts(job, workdir, audit_prompt, context, artifacts, progress)
            except (OSError, ValueError, KeyError, subprocess.SubprocessError):
                output["errors"].append({"item_id":item["item_id"],"code":"self_check_unavailable"})
            revision = digest(artifact)
            report = None
            if checks:
                report = {"status":"completed","run_id":payload["run_id"],"batch_id":payload["batch_id"],
                          "item_id":item["item_id"],"artifact_kind":kind,"artifact_id":artifact_id,
                          "artifact_revision":revision,"rule_version":payload["rule_version"],"checks":checks}
            if script_mode:
                script.update(revision=revision, compliance=report, compliance_failed=not bool(report))
                if board is not None:
                    board_revision = digest(board)
                    if report:
                        report["storyboard_revision"] = board_revision
                    output["storyboards"].append({"id":f"{artifact_id}-storyboard","revision":board_revision,
                                                  "script_id":artifact_id,"script_revision":revision,"storyboard":board,
                                                  "compliance_in_script":True})
                output["scripts"].append(script)
            else:
                if not storyboard_approved(item):
                    raise ValueError("approval_changed")
                output["storyboards"].append({"id":artifact_id, "revision":revision, "script_id":item["script_id"],
                    "script_revision":item["script_revision"], "storyboard":artifact, "compliance":report, "compliance_failed":not bool(report)})
        except (ValueError, OSError, KeyError, subprocess.SubprocessError) as exc:
            reason = str(exc) if type(exc) is ValueError and str(exc).isidentifier() else "item_failed"
            output["errors"].append({"item_id":item["item_id"],"code":reason})
            rejected = reason

        record("item_rejected" if rejected else "item_done", index, finished=True, reason=rejected)
        return output

    def run_item(index, item):
        try:
            return process_item(index, item)
        except Exception:
            # Signal the sibling before this executor slot can start another item.
            job["stop"].set()
            raise

    output = {"scripts":[], "storyboards":[], "errors":[]}
    outcomes = [None] * len(payload["items"])
    failure = None
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {executor.submit(run_item, index, item):index for index, item in enumerate(payload["items"])}
        for future in as_completed(futures):
            if future.cancelled():
                continue
            try:
                outcomes[futures[future]] = future.result()
            except Exception as exc:
                if failure is None or isinstance(failure, JobCancelled):
                    failure = exc
                job["stop"].set()
                for pending in futures:
                    pending.cancel()
    if failure:
        raise failure
    for item_output in outcomes:
        for key in output:
            output[key].extend(item_output[key])

    count = len(payload["items"])
    update(job,"saving",count)
    output["references"] = {market: value for market,value in references.items() if market}
    completed = bool(output["scripts"] or output["storyboards"])
    update(job, "completed" if completed else "failed", count, result=output, error=None if completed else "no_usable_output")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--prompt-dir", type=Path, default=Path.home() / "work/emw3-anc/video")
    options = parser.parse_args()
    while True:
        job = claim()
        if job:
            try:
                try:
                    run_job(job, options.prompt_dir)
                except (OSError, ValueError, KeyError, RuntimeError, subprocess.SubprocessError):
                    update(job, "failed", 0, error="worker_error")
            except JobCancelled:
                pass
        if options.once:
            break
        if not job:
            time.sleep(3)


if __name__ == "__main__":
    main()
