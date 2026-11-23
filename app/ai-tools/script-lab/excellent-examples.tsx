"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { Card } from "@/components/ui/card";
import { sampleScriptBatch, sampleStoryboards, type SampleScript, type SampleStoryboard } from "@/lib/script-lab-sample-batch";
import { batchName } from "./batch-name";
import { parseStored, useVideoBatch, useVideoJobs } from "./use-video-jobs";
import { readGeneratorStorage, useGeneratorStorage, writeGeneratorStorage } from "./use-generator-selection";
import { ScriptCopy, StoryboardContent } from "./video-artifact-detail";
import type { LocalizedText } from "@/lib/script-lab-project";
import styles from "./workbench.module.css";

type Translate = (text: LocalizedText) => string;
type Example = { batch_id: string; script_id: string; title: LocalizedText };
const endpoint = (customer: boolean) => customer ? "/script-lab/reviews" : "/ai-tools/script-lab/reviews";

function useExamples(customer: boolean, attempt = 0) {
  const url = endpoint(customer);
  const key = `script-lab:excellent-examples:v1:${url}`;
  const snapshot = useGeneratorStorage(key);
  const examples = useMemo(() => parseStored<Example[]>(snapshot), [snapshot]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const initial = readGeneratorStorage(key);
    void fetch(`${url}?view=examples`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error();
        const data = await response.json() as { examples: Example[] };
        if (!controller.signal.aborted && readGeneratorStorage(key) === initial && Array.isArray(data.examples)) {
          writeGeneratorStorage(key, JSON.stringify(data.examples));
          setFailed(false);
        }
      }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [attempt, key, url]);
  return { examples, failed, key };
}

export function ExampleActions({ batch, ids, customer, canManage, signIn, onSavedChange, titles, t }: {
  batch: string; ids: string[]; customer: boolean; canManage: boolean; signIn: () => void; onSavedChange: (ids: Set<string>) => void; titles: Map<string, LocalizedText>; t: Translate;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"added" | "removed" | "error">();
  const [attempt, setAttempt] = useState(0);

  const { examples, failed, key } = useExamples(customer, attempt);
  const saved = useMemo(() => examples && new Set(examples.filter(item => item.batch_id === batch).map(item => item.script_id)), [examples, batch]);
  useEffect(() => { if (saved) onSavedChange(saved); }, [saved, onSavedChange]);

  const addable = saved ? ids.filter(id => !saved.has(id)) : [];
  const removable = saved ? ids.filter(id => saved.has(id)) : [];

  async function save(add: boolean, targets: string[]) {
    if (!canManage) return signIn();
    setBusy(true);
    setStatus(undefined);
    try {
      const response = await fetch(endpoint(customer), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: add ? "save_example" : "remove_example", batch_id: batch, script_ids: targets }),
      });
      if (!response.ok) throw new Error();
      const latest = parseStored<Example[]>(readGeneratorStorage(key)) ?? [];
      const next = latest.filter(item => item.batch_id !== batch || !targets.includes(item.script_id));
      if (add) targets.forEach(id => {
        const title = titles.get(id);
        if (title) next.unshift({ batch_id: batch, script_id: id, title });
      });
      writeGeneratorStorage(key, JSON.stringify(next));
      setStatus(add ? "added" : "removed");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }
  return <div className={styles.exampleActions}>
    {!saved && !failed && <p role="status">{t(["Checking example status…", "正在核对优秀案例状态…"])}</p>}
    {!saved && failed && <Button variant="secondary" onClick={() => { setStatus(undefined); setAttempt(value => value + 1); }}>
      {t(["Retry", "重试"])}
    </Button>}
    {addable.length > 0 && <Button variant="secondary" size="small" className={`${styles.reviewAction} ${styles.exampleAction}`} data-decision="approved" leadingIcon={Plus} disabled={busy} onClick={() => void save(true, addable)}>
      {ids.length === 1 ? t(["Add to excellent examples", "加入优秀案例"])
        : addable.length === ids.length ? t(["Add all to excellent examples", "全部加入优秀案例"])
        : t([`Add ${addable.length} to excellent examples`, `加入 ${addable.length} 条到优秀案例`])}
    </Button>}
    {removable.length > 0 && <Button variant="secondary" size="small" className={`${styles.reviewAction} ${styles.exampleAction}`} data-decision="rejected" leadingIcon={Minus} disabled={busy} onClick={() => void save(false, removable)}>
      {ids.length === 1 ? t(["Remove from excellent examples", "从优秀案例移除"])
        : removable.length === ids.length ? t(["Remove all from excellent examples", "全部移除优秀案例"])
        : t([`Remove ${removable.length} from excellent examples`, `从优秀案例移除 ${removable.length} 条`])}
    </Button>}
    {status && <p role="status">{status === "added" ? t(["Added", "已加入"]) : status === "removed"
      ? t(["Removed", "已移除"]) : t(["Update failed. Try again.", "操作失败，请重试。"])}</p>}
  </div>;
}

export function ExcellentExamples({ customer, t }: { customer: boolean; t: Translate }) {
  const { examples, failed } = useExamples(customer);
  const jobs = useVideoJobs(customer);
  const [selectedBatch, setSelectedBatch] = useState<string>();
  const [selectedScript, setSelectedScript] = useState<string>();
  const grouped = new Map<string, Example[]>();
  for (const example of examples ?? []) {
    const group = grouped.get(example.batch_id);
    if (group) group.push(example);
    else grouped.set(example.batch_id, [example]);
  }
  const batchDates = new Map(jobs.map(job => [job.batch_id, job.finished_at ?? job.submitted_at]));
  const batchIds = [...grouped.keys()].sort((a, b) =>
    (Date.parse(batchDates.get(b) ?? "") || 0) - (Date.parse(batchDates.get(a) ?? "") || 0));
  const batchId = selectedBatch && grouped.has(selectedBatch) ? selectedBatch : batchIds[0];
  const scripts = grouped.get(batchId) ?? [];
  const selected = scripts.find(item => item.script_id === selectedScript) ?? scripts[0];
  const { batch: loaded, failed: unavailable } = useVideoBatch(customer,
    batchId && batchId !== sampleScriptBatch.id ? batchId : null);

  const demo = batchId === sampleScriptBatch.id;
  const script: SampleScript | undefined = (demo ? sampleScriptBatch.scripts : loaded?.scripts)
    ?.find(item => item.id === selected?.script_id);
  const board: SampleStoryboard | undefined = script && (demo ? sampleStoryboards.get(script.id)
    : loaded?.storyboards?.find(item => item.script_id === script.id)?.storyboard);

  if (!selected) return <Card className={styles.panel}>
    <p role="status">{failed ? t(["Could not load examples.", "无法读取优秀案例。"])
      : examples ? t(["No excellent examples yet.", "暂无优秀案例。"]) : t(["Loading examples…", "正在读取优秀案例…"])}</p>
  </Card>;

  return <section className={styles.candidateScriptGroup} aria-label={t(["Batches", "批次"])}>
    <h2 className={styles.candidateGroupHeading}>{t(["Batches", "批次"])}</h2>
    <div className={styles.scriptBatchList} role="group" aria-label={t(["Example batches", "案例批次"])}>
      {batchIds.map((id, index) => {
        const date = batchDates.get(id);
        return <button key={id} type="button" aria-pressed={id === batchId} aria-controls="excellent-example-scripts"
          onClick={() => { setSelectedBatch(id); setSelectedScript(undefined); }}>
          <strong>{date ? <time dateTime={date}>{batchName(date)}</time>
            : t([`Batch ${index + 1}`, `批次 ${index + 1}`])}</strong>
        </button>;
      })}
    </div>
    <Card id="excellent-example-scripts" className={`${styles.panel} ${styles.candidateTabPanel}`}>
      <h2>{t([`Scripts (${scripts.length})`, `剧本名单（${scripts.length} 条）`])}</h2>
      <div className={styles.scriptNames} role="group" aria-label={t(["Example scripts", "案例剧本"])}>
        {scripts.map(item => <button key={item.script_id} type="button" aria-pressed={item.script_id === selected.script_id}
          aria-controls="excellent-example-detail" onClick={() => { setSelectedBatch(batchId); setSelectedScript(item.script_id); }}>
          <strong>{t(item.title)}</strong>
        </button>)}
      </div>
      <Card id="excellent-example-detail" className={`${styles.panel} ${styles.candidateTabPanel}`}>
        <h2>{t(selected.title)}</h2>
        {script ? <div className={styles.storyboardSections}>
          <section><h3>{t(["Combination elements", "组合元素"])}</h3>
            <p>{script.combination.map(value => t(value.label)).join(" × ")}</p>
          </section>
          <section><h3>{t(["Opening hook", "开头 Hook"])}</h3><ScriptCopy copy={script.copy.hook} language={script.language} t={t} /></section>
          <section><h3>{t(["Script text", "剧本正文"])}</h3><ScriptCopy copy={script.copy.body} language={script.language} t={t} /></section>
          <section><h3>{t(["Closing CTA", "结尾 CTA"])}</h3><ScriptCopy copy={script.copy.cta} language={script.language} t={t} /></section>
          {board && <StoryboardContent storyboard={board} t={t} />}
        </div> : <p role="status">{unavailable || loaded || demo
          ? t(["This example is unavailable.", "无法读取这个案例。"]) : t(["Loading example…", "正在读取案例…"])}</p>}
      </Card>
    </Card>
  </section>;
}

export function SelectionToggle({ checked, ids, onChange, t }: {
  checked: Set<string>; ids: string[]; onChange: (next: Set<string>) => void; t: Translate;
}) {
  const all = ids.length > 0 && ids.every(id => checked.has(id));
  return <label className={styles.briefChoice}>
    <input type="checkbox" checked={all} ref={input => { if (input) input.indeterminate = !all && checked.size > 0; }}
      onChange={event => onChange(new Set(event.target.checked ? ids : []))} />
    {t(["Select all", "全选"])}
  </label>;
}
