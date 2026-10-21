import "server-only";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { enqueueAiJob, readAiJob, readTestingReadoutCache, type TestingReadoutCacheRecord } from "@/lib/ai-job-queue";
import { applyReadoutTranslation, decodeReadoutTranslation, readoutTranslationStrings, translationChunks } from "@/lib/testing-readout-translation-contract";
const pool = new Pool({ connectionString: process.env.KLAVIYO_DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2, connectionTimeoutMillis: 10000 });
export function readoutSourceHash(payload: unknown) { return createHash("sha256").update(JSON.stringify(payload)).digest("hex"); }
function jobId(hash: string, index: number) { return `testing-translation:v1:${hash}:${index}`; }
async function savedTranslation(key: string, hash: string) {
  const saved = await pool.query<{ payload: unknown }>("select payload from testing_ai_readout_translations where cache_key=$1 and language='zh' and source_hash=$2", [key, hash]);
  return saved.rows[0]?.payload;
}
async function publishTranslation(record: TestingReadoutCacheRecord, enqueue: boolean) {
  const hash = readoutSourceHash(record.payload), saved = await savedTranslation(record.cache_key, hash);
  if (saved) return { payload: saved, pending: false };
  const chunks = translationChunks(readoutTranslationStrings(record.payload));
  const translated = new Map<string, string>();
  let pending = false;
  const prompt = enqueue ? await readFile(path.join(process.cwd(), "prompts/insights/content-testing-translation.md"), "utf8") : "";
  for (let index = 0; index < chunks.length; index++) {
    const id = jobId(hash, index), source = chunks[index];
    const existing = await readAiJob(id).catch(error => { if (error instanceof Error && error.message === "AI task not found.") return null; throw error; });
    const job = existing ?? (enqueue ? await enqueueAiJob(id, {
      mode: "question", language: "zh-CN", dashboard_id: "bluevua-testing-translation",
      period: { start: record.period_start ?? "2026-01-01", end: record.period_end ?? "2026-01-01" }, comparison: null,
      preset_label: "Translation only", comparison_label: "Not applicable", question: prompt,
      analysis_payload: { translation_only: true, source_hash: hash, cache_key: record.cache_key, strings: Object.fromEntries(source.map((text, i) => [`s${i}`, text])) },
    }) : null);
    if (job?.status === "failed") throw new Error(`Translation task failed: ${id}`);
    if (!job || job.status !== "completed") { pending = true; continue; }
    for (const [text, value] of decodeReadoutTranslation(job.result, source)) translated.set(text, value);
  }
  if (pending) return { payload: null, pending: true };
  const payload = applyReadoutTranslation(record.payload, translated);
  // Do not publish an old translation after its English source has been replaced.
  const current = (await readTestingReadoutCache([record.cache_key]))[0];
  if (!current || readoutSourceHash(current.payload) !== hash) return { payload: null, pending: true };
  await pool.query(`insert into testing_ai_readout_translations(cache_key,language,source_hash,payload) values($1,'zh',$2,$3::jsonb) on conflict(cache_key,language) do update set source_hash=excluded.source_hash,payload=excluded.payload,generated_at=now()`, [record.cache_key, hash, JSON.stringify(payload)]);
  return { payload, pending: false };
}
export async function translatedTestingReadouts(records: TestingReadoutCacheRecord[]) {
  const output: TestingReadoutCacheRecord[] = [];
  for (const record of records) {
    try {
      const result = await publishTranslation(record, false);
      output.push({ ...record, payload: result.payload ?? { ...(record.payload as Record<string, unknown>), _translation_pending: true } });
    } catch {
      // A failed translation must not hide or break the saved English analysis.
      output.push({ ...record, payload: { ...(record.payload as Record<string, unknown>), _translation_error: true } });
    }
  }
  return output;
}
export async function refreshTestingTranslations() {
  const keys = await pool.query<{ cache_key: string }>("select cache_key from testing_ai_readout_cache where cache_key='framework:v1' or generated_at >= now()-interval '2 days' order by cache_key");
  const records = (await readTestingReadoutCache(keys.rows.map(row => row.cache_key))).sort((a,b) => a.cache_key.localeCompare(b.cache_key));
  let pending = false;
  const errors: string[] = [];
  for (const record of records) {
    try { const result = await publishTranslation(record, true); pending ||= result.pending; }
    catch (error) { errors.push(`${record.cache_key}: ${error instanceof Error ? error.message : "Translation unavailable"}`); }
  }
  return { status: pending ? "translating" : errors.length ? "translation_failed" : "completed", pending, records: records.length, ...(errors.length ? { errors } : {}) };
}
