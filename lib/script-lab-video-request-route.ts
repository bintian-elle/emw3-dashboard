import { NextResponse, type NextRequest } from "next/server";
import { isLocalScriptLabHost } from "./script-lab-host";
import { getVideoActor } from "./script-lab-video-actor";
import { cancelVideoJob, enqueueVideoJob, listVideoJobs, loadVideoBatch, loadVideoJob } from "./script-lab-video-job-store";
import { videoIdPattern } from "./script-lab-video-jobs";
import { prepareScriptLabVideoRequest } from "./script-lab-video-request";
import { loadTrendReference } from "./script-lab-trend-store";

export async function prepareVideoRequest(request: NextRequest, visibility: "public" | "internal") {
  const headers = { "Cache-Control": "private, no-store" };
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
  const host = request.headers.get("host") ?? "";
  if (request.headers.get("origin") !== `${isLocalScriptLabHost(host) ? "http" : "https"}://${host}`) {
    return reply({ error: "forbidden" }, 403);
  }

  let input: { action?: unknown; job_id?: unknown; selected_rule_ids?: unknown; trend_id?: unknown } | null;
  try {
    if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return reply({ error: "invalid_request" }, 415);
    const text = await request.text();
    if (text.length > 64_000) return reply({ error: "invalid_request" }, 413);
    input = JSON.parse(text);
  } catch {
    return reply({ error: "invalid_request" }, 400);
  }

  try {
    const actor = await getVideoActor(visibility, host);
    if (!actor) return reply({ error: "forbidden" }, 403);
    if (input?.action === "cancel") {
      if (typeof input.job_id !== "string" || !videoIdPattern.test(input.job_id)) return reply({ error: "invalid_request" }, 400);
      const job = await cancelVideoJob(input.job_id, actor.email, visibility);
      return job ? reply({ job }) : reply({ error: "job_not_cancellable" }, 409);
    }
    const ids = input?.selected_rule_ids;
    if (!Array.isArray(ids) || !ids.every(id => typeof id === "string" && videoIdPattern.test(id))) {
      return reply({ error: "invalid_request" }, 400);
    }
    const result = await prepareScriptLabVideoRequest(ids, visibility);
    if (result.payload) {
      const trendId = input?.trend_id;
      if (trendId != null && (typeof trendId !== "string" || trendId.length > 220)) return reply({ error: "invalid_request" }, 400);
      const trend = typeof trendId === "string" ? await loadTrendReference(trendId) : undefined;
      if (trendId && !trend) return reply({ error: "trend_unavailable" }, 409);
      const payload = trend ? { ...result.payload, trend_reference: trend } : result.payload;
      const job = await enqueueVideoJob(payload, actor, visibility);
      return job ? reply({ job, excluded_count: result.payload.excluded_count }, 202) : reply({ error: "project_unavailable" }, 404);
    }
    return reply(result, result.error === "project_unavailable" ? 404 : 409);
  } catch {
    return reply({ error: "unavailable" }, 503);
  }
}


export async function readVideoRequest(request: NextRequest, visibility: "public" | "internal") {
  const headers = { "Cache-Control": "private, no-store" };
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
  try {
    const params = request.nextUrl.searchParams;
    const controls = params.get("controls") === "1";
    const actor = visibility === "internal" || controls
      ? await getVideoActor(visibility, request.headers.get("host") ?? "") : null;
    if (visibility === "internal" && !actor) {
      return reply({ error: "forbidden" }, 403);
    }
    const batchId = params.get("batch");
    const jobId = params.get("job");
    const id = batchId ?? jobId;
    if (id !== null) {
      if (!videoIdPattern.test(id)) return reply({ error: "invalid_request" }, 400);
      const result = batchId ? await loadVideoBatch(id, visibility) : await loadVideoJob(id, visibility);
      return result ? reply(result) : reply({ error: "unavailable" }, 404);
    }
    return reply({ jobs: await listVideoJobs(visibility, controls ? actor?.email : undefined) });
  } catch {
    return reply({ error: "unavailable" }, 503);
  }
}
