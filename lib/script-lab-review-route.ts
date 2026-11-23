import { listExamples, saveExamples } from "./script-lab-examples";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { sameComplianceTarget } from "./script-lab-compliance";
import { currentComplianceTarget, parsePreviewCompliance, readPreviewCompliance, registerPreviewStoryboards, savePreviewCompliance } from "./script-lab-compliance-preview";
import { isLocalScriptLabHost } from "./script-lab-host";
import { getScriptLabRuleActor } from "./script-lab-rule-access";
import { complianceSelfCheckStage, scriptReviewDecisions, type ScriptRevision } from "./script-lab-review";
import { enqueueVideoJob, loadVideoBatch, loadVideoSourcePayload } from "./script-lab-video-job-store";
import { getVideoActor } from "./script-lab-video-actor";
import { videoIdPattern, type VideoBatch } from "./script-lab-video-jobs";
import { prepareScriptLabVideoRequest } from "./script-lab-video-request";
import { sampleScriptBatch } from "./script-lab-sample-batch";
import { currentScriptRevision, currentScriptRevisions, loadScriptReviews, reviewBatchId, sameScriptRevision, saveScriptReview } from "./script-lab-review-store";

type Visibility = "public" | "internal";
const headers = { "Cache-Control": "private, no-store" };
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers });

function actorFor(request: NextRequest, visibility: Visibility) {
  return getScriptLabRuleActor(visibility === "public" ? "customer" : "internal", request.headers.get("host") ?? "");
}

export async function getReviews(request: NextRequest, visibility: Visibility) {
  try {
    const actor = await actorFor(request, visibility);
    if (visibility === "internal" && !actor) return reply({ error: "forbidden" }, 403);
    const params = request.nextUrl.searchParams;
    if (params.get("view") === "examples") return reply({ examples: await listExamples(visibility) });
    if (params.get("view") === "compliance") {
      if (!isLocalScriptLabHost(request.headers.get("host") ?? "")) return reply({ error: "unavailable" }, 404);
      const artifact_kind = params.get("artifact_kind");
      if (artifact_kind !== "script" && artifact_kind !== "storyboard") return reply({ error: "invalid_request" }, 400);
      const target = {
        artifact_kind, batch_id: params.get("batch_id") ?? "", artifact_id: params.get("artifact_id") ?? "",
        artifact_revision: params.get("artifact_revision") ?? "",
      } as const;
      const current = currentComplianceTarget(target);
      if (!current || !sameComplianceTarget(current, target)) return reply({ error: "version_changed" }, 409);
      return reply({ report: readPreviewCompliance(current) });
    }
    const requested = params.get("batch");
    const batch = requested && videoIdPattern.test(requested) ? await loadVideoBatch(requested, visibility) : undefined;
    if (requested && (!batch || batch.mode !== "script")) return reply({ error: "unavailable" }, 404);
    const revisions = batch ? batch.scripts.map(script => ({ script_id: script.id, script_revision: script.revision })) : currentScriptRevisions;
    const reviews = await loadScriptReviews(visibility, batch?.batch_id, revisions);
    return reply({
      revisions,
      reviews: actor ? reviews : reviews.map(review => ({ ...review, note: "" })),
    });
  } catch {
    return reply({ error: "unavailable" }, 503);
  }
}

export async function postReview(request: NextRequest, visibility: Visibility) {
  const host = request.headers.get("host") ?? "";
  const origin = `${isLocalScriptLabHost(host) ? "http" : "https"}://${host}`;
  if (request.headers.get("origin") !== origin) return reply({ error: "forbidden" }, 403);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return reply({ error: "invalid_request" }, 415);

  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 128_000) return reply({ error: "invalid_request" }, 400);
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) return reply({ error: "invalid_request" }, 400);
    body = value as Record<string, unknown>;
  } catch {
    return reply({ error: "invalid_request" }, 400);
  }

  try {
    const actor = await actorFor(request, visibility);
    if (!actor) return reply({ error: "forbidden" }, 403);
    if (body.action === "receive_compliance") {
      if (visibility !== "internal" || !isLocalScriptLabHost(host)) return reply({ error: "forbidden" }, 403);
      const report = parsePreviewCompliance(body.report);
      if (!report) return reply({ error: "invalid_report" }, 400);
      return savePreviewCompliance(report) ? reply({ saved: true }) : reply({ error: "version_changed" }, 409);
    }
    if (body.action === "save_example" || body.action === "remove_example") {
      const batchId = body.batch_id;
      if (typeof batchId !== "string" || (batchId !== reviewBatchId && !videoIdPattern.test(batchId))) return reply({ error: "invalid_batch" }, 400);
      const batch = batchId === reviewBatchId ? undefined : await loadVideoBatch(batchId, visibility);
      const scripts = batch?.scripts ?? (batchId === reviewBatchId ? sampleScriptBatch.scripts : []);
      const ids = Array.isArray(body.script_ids) ? body.script_ids : [body.script_id];
      const selected = scripts.filter(script => ids.includes(script.id));
      if (!selected.length || selected.length !== ids.length) return reply({ error: "invalid_request" }, 400);
      const entries = selected.map(script => ({
        script_id: script.id,
        script_revision: "revision" in script ? script.revision : currentScriptRevision(script.id)?.script_revision,
        note: JSON.stringify(script.pain.map(title => title.slice(0,200))),
      }));
      const rows = await saveExamples(`example:${batchId}`, entries, body.action === "save_example", actor, visibility);
      return rows.length === entries.length ? reply({ saved: true }) : reply({ error: "unavailable" }, 503);
    }
    if (body.batch_id !== reviewBatchId) {
      if (typeof body.batch_id !== "string" || !videoIdPattern.test(body.batch_id)) return reply({ error: "invalid_batch" }, 400);
      const batch = await loadVideoBatch(body.batch_id, visibility);
      if (!batch || batch.mode !== "script") return reply({ error: "invalid_batch" }, 404);
      return await handleGeneratedReview(body, batch, actor, await getVideoActor(visibility, host), visibility);
    }

    if (body.action === "review" || body.action === "prepare_regeneration") {
      const regenerating = body.action === "prepare_regeneration";
      const script = currentScriptRevision(body.script_id);
      const decision = regenerating ? "changes_requested"
        : scriptReviewDecisions.find(value => value === body.decision && value !== "changes_requested");
      const note = typeof body.note === "string" ? body.note.trim() : "";
      if (!script || !decision || note.length > 2000 || /\x00/.test(note)) return reply({ error: "invalid_request" }, 400);
      if (script.script_revision !== body.script_revision) return reply({ error: "version_changed" }, 409);
      let prepared;
      if (regenerating) {
        const sourceScript = sampleScriptBatch.scripts.find(item => item.id === script.script_id);
        if (!sourceScript) return reply({ error: "invalid_request" }, 400);
        prepared = await prepareScriptLabVideoRequest({
          sourceScript, sourceBatchId: reviewBatchId, sourceRevision: script.script_revision, reviewNote: note,
        }, visibility);
        if (!("payload" in prepared)) return reply(prepared, 409);
      }
      const review = await saveScriptReview({ ...script, decision, note }, actor, visibility);
      return review ? reply({ review, ...prepared }, 201) : reply({ error: "unavailable" }, 404);
    }

    if (body.action === "prepare_storyboards") {
      if (!Array.isArray(body.scripts) || !body.scripts.length || body.scripts.length > currentScriptRevisions.length) {
        return reply({ error: "invalid_request" }, 400);
      }
      const items: ScriptRevision[] = [];
      for (const item of body.scripts) {
        if (typeof item?.script_id !== "string" || typeof item?.script_revision !== "string"
          || items.some(script => script.script_id === item.script_id)) return reply({ error: "invalid_request" }, 400);
        const script = { script_id: item.script_id, script_revision: item.script_revision };
        if (!sameScriptRevision(script)) return reply({ error: "version_changed" }, 409);
        items.push(script);
      }
      const reviews = await loadScriptReviews(visibility);
      if (items.some(item => !reviews.some(review => review.script_id === item.script_id && review.decision === "approved"))) {
        return reply({ error: "approval_required" }, 409);
      }
      const preview = isLocalScriptLabHost(host) ? registerPreviewStoryboards(items) : undefined;
      return reply({ scripts: items, preview, compliance_self_check_stage: complianceSelfCheckStage });
    }
    return reply({ error: "invalid_request" }, 400);
  } catch {
    return reply({ error: "unavailable" }, 503);
  }
}

async function handleGeneratedReview(
  body: Record<string, unknown>, batch: VideoBatch, actor: NonNullable<Awaited<ReturnType<typeof actorFor>>>,
  author: Awaited<ReturnType<typeof getVideoActor>>, visibility: Visibility,
) {
  if (body.action === "review" || body.action === "prepare_regeneration") {
    const script = batch.scripts.find(item => item.id === body.script_id);
    if (!script || script.revision !== body.script_revision) return reply({ error: "version_changed" }, 409);
    const regenerating = body.action === "prepare_regeneration";
    const decision = regenerating ? "changes_requested"
      : scriptReviewDecisions.find(value => value === body.decision && value !== "changes_requested");
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (!decision || note.length > 2000 || note.includes("\0")) return reply({ error: "invalid_request" }, 400);
    let job;
    if (regenerating) {
      if (!author) return reply({ error: "forbidden" }, 403);
      const packet = await prepareScriptLabVideoRequest({
        sourceScript: script, sourceBatchId: batch.batch_id, sourceRevision: script.revision, reviewNote: note,
      }, visibility);
      if (!packet.payload) return reply(packet, 409);
      job = await enqueueVideoJob(packet.payload, author, visibility);
      if (!job) return reply({ error: "unavailable" }, 503);
    }
    const review = await saveScriptReview({
      script_id: script.id, script_revision: script.revision, decision, note,
    }, actor, visibility, batch.batch_id);
    return review ? reply({ review, job }, 201) : reply({ error: "unavailable" }, 503);
  }
  if (body.action !== "prepare_storyboards" || !Array.isArray(body.scripts) || !body.scripts.length || !author) {
    return reply({ error: "invalid_request" }, 400);
  }

  const requested: unknown[] = body.scripts;
  if (requested.length > batch.scripts.length) return reply({ error: "invalid_request" }, 400);
  const scripts = batch.scripts.filter(script => requested.some(item =>
    item && typeof item === "object" && "script_id" in item && "script_revision" in item
    && item.script_id === script.id && item.script_revision === script.revision));
  if (scripts.length !== requested.length) return reply({ error: "version_changed" }, 409);
  const revisions = scripts.map(script => ({ script_id: script.id, script_revision: script.revision }));
  const reviews = await loadScriptReviews(visibility, batch.batch_id, revisions);
  if (scripts.some(script => !reviews.some(review => review.script_id === script.id && review.decision === "approved"))) {
    return reply({ error: "approval_required" }, 409);
  }

  const payload = await loadVideoSourcePayload(batch.batch_id, visibility);
  if (!payload) return reply({ error: "unavailable" }, 503);
  const runId = randomUUID();
  const job = await enqueueVideoJob({
    ...payload,
    run_id: runId, batch_id: randomUUID(), mode: "storyboard", output_count: scripts.length,
    source_batch_id: batch.batch_id,
    trigger: { action: "generate_storyboard", id: runId },
    items: scripts.map((script, index) => ({
      item_id: `${runId}:${index + 1}`,
      script_id: script.id, script_revision: script.revision, source_script_batch_id: batch.batch_id,
      source_script_revision: script.revision, approval_id: reviews.find(review => review.script_id === script.id)?.approval_id,
      script,
    })),
  } as Parameters<typeof enqueueVideoJob>[0], author, visibility);
  return job ? reply({ job }, 202) : reply({ error: "unavailable" }, 503);
}
