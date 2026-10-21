import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { concludedTestsForChannel } from "@/lib/concluded-tests";
import { readConcludedSnapshot } from "@/lib/concluded-test-snapshot";
import { readGoogleCreativeArchive } from "@/lib/google-creative-archive";
import { readAiJob, readTestingReadoutCache } from "@/lib/ai-job-queue";
import { testingReadoutKey } from "@/lib/testing-readout-contract";
import { publishCompletedTestingReadouts, publishTestingReadoutJob } from "@/lib/testing-readout-publish";

const pool = new Pool({ connectionString: process.env.KLAVIYO_DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2, connectionTimeoutMillis: 12000 });
function compactArchive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compactArchive);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !["resourceName", "policySummaryInfo", "policySummary"].includes(key)).map(([key, item]) => [key, compactArchive(item)]));
  return value;
}
/** Discover finalized tests on the daily run; each stable test ID owns one immutable lifetime result. */
export async function refreshConcludedTestingReadouts() {
  await publishCompletedTestingReadouts();
  const pending: string[] = [], saved: string[] = [], awaitingFinalSnapshot: string[] = [];
  for (const definition of concludedTestsForChannel("Google Search")) {
    const key = testingReadoutKey({ label: "Test lifetime", start: "", end: "", concludedTestId: definition.id })!;
    if ((await readTestingReadoutCache([key])).length) { saved.push(key); continue; }
    const snapshot = await readConcludedSnapshot(definition.id);
    if (!snapshot?.finalized || !snapshot.report.period) { awaitingFinalSnapshot.push(definition.id); continue; }
    const id = `testing-concluded:${definition.id}:lifetime:v1`;
    const exists = await pool.query("select id from ai_job_queue where id=$1", [id]);
    if (!exists.rowCount) {
      const [source, prompt, extra, checklist, archive] = await Promise.all([
        readFile(path.join(process.cwd(), "prompts/insights/content-testing-source.md"), "utf8"),
        readFile(path.join(process.cwd(), "prompts/insights/content-testing.md"), "utf8"),
        readFile(path.join(process.cwd(), "prompts/insights/content-testing-concluded.md"), "utf8"),
        readFile(path.join(process.cwd(), "prompts/insights/content-testing-requirements.json"), "utf8"),
        readGoogleCreativeArchive(),
      ]);
      const document = JSON.parse(checklist) as { channels: Array<{ channel: string; requirements: Array<{ id: string }> }> };
      const search = document.channels.find(row => row.channel === "Google Search")!;
      const campaigns = archive?.campaigns.filter(row => row.name === definition.campaignName || row.name.startsWith(`${definition.campaignName} ${definition.name}`)) ?? [];
      const ids = new Set(campaigns.map(row => row.id));
      const creativeCatalog = archive ? { campaigns, groups: archive.groups.filter(row => ids.has(row.campaign.id)), ads: archive.ads.filter(row => ids.has(row.campaign.id)), assets: archive.assets.filter(row => ids.has(row.campaign.id)) } : { unavailable: true };
      // Lifetime snapshot is the existing native lifetime schema label. The stable
      // concluded ID is controller metadata, never confused with Social's cache key.
      const period = { label: "Lifetime snapshot", ...snapshot.report.period, concludedTestId: definition.id };
      const instructions = `${source}\n\n${prompt}\n\n${extra}`;
      const body = {
        mode: "testing_readout", dashboard_id: "bluevua-content-testing-concluded", language: "en",
        period: snapshot.report.period, comparison: null, preset_label: "Concluded test · Lifetime", comparison_label: "Documented test versus control",
        conversation: { project: "bluevua", kind: "insights" }, insight_prompt: instructions,
        analysis_payload: {
          generation_instructions: instructions, run_mode: "period_readout_batch", prompt_version: "content-testing-concluded-v1", concluded_test_id: definition.id,
          regenerate_framework: true, static_framework: null, captured_at: snapshot.capturedAt,
          requirement_ids: { "Google Search": search.requirements.map(row => row.id) }, source_document: document,
          periods: [{ period, comparison: null, tests: [{ test_id: definition.id, channel: "Google Search", campaign_name: definition.campaignName, status: "Concluded", definition, data: snapshot.report, daily_history: snapshot.dailyGroups ?? [], source: snapshot.sourceUpdatedAt, snapshot_finalized: true }], data_gaps: [] }],
          creative_catalog: { captured_at: archive?.capturedAt ?? null, basis: "Archived inventory describes available content and platform metadata at capture, not historical ad-level performance during the experiment.", inventory: compactArchive(creativeCatalog) }, supporting_materials: definition.resourcesHref,
        },
      };
      await pool.query("insert into ai_job_queue(id,request_id,body,priority,finalized) values($1,$2,$3::jsonb,-10,true) on conflict(id) do nothing", [id, randomUUID(), JSON.stringify(body)]);
    }
    const job = await readAiJob(id);
    if (job.status === "failed") throw new Error(`Concluded analysis failed (${id}); inspect the saved task before retrying.`);
    if (job.status === "completed") { await publishTestingReadoutJob(job); saved.push(key); }
    else pending.push(id);
  }
  return { pending: pending.length > 0, status: pending.length ? "generating_concluded" : "completed", jobs: pending, saved, awaitingFinalSnapshot };
}
