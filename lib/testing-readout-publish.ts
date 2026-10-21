import "server-only";
import { completedTestingReadoutJobs, markTestingReadoutPublished, markTestingReadoutValidationError, writeTestingReadoutCache, type QueuedJob } from "@/lib/ai-job-queue";
import { decodeTestingReadouts, generatedFramework, testingReadoutKey, TestingReadoutValidationError, type ReadoutPeriod } from "@/lib/testing-readout-contract";
import { overviewExecutiveSummary } from "@/lib/testing-readout-overview";

export async function publishTestingReadoutJob(job: QueuedJob) {
  if ((job.result as { testing_cache_published_at?: string })?.testing_cache_published_at) return;
  const input = job.body.analysis_payload as { captured_at?:string; prompt_version?: string; regenerate_framework?: boolean; requirement_ids?: Record<string,string[]>; periods: Array<{ period: ReadoutPeriod; tests: Array<{ test_id: string }> }> };
  const supplied = input.periods;
  const promptVersion = input.prompt_version ?? "content-testing-v2";
  const identities = Object.fromEntries(supplied.map(item => [testingReadoutKey(item.period)!, item.tests.map(test => test.test_id)]));
  const decoded = decodeTestingReadouts(job.result, supplied.map(item => item.period), identities, input.requirement_ids);
  const frameworkTests = input.regenerate_framework && !decoded.errors.length ? generatedFramework([...decoded.records.values()].filter(record=>testingReadoutKey(record.period)===testingReadoutKey(supplied[0].period) || record.period.label==="Lifetime snapshot").flatMap(record=>record.tests)) : null;
  // Save valid periods even if another period fails validation. Older jobs cannot
  // overwrite a more recently generated result for the same reporting dates.
  for (const [cacheKey, payload] of decoded.records) await writeTestingReadoutCache({
    cache_key: cacheKey, readout_type: "period", period_label: payload.period.label, period_start: payload.period.start, period_end: payload.period.end,
    comparison_label: null, comparison_start: null, comparison_end: null, prompt_version: promptVersion, payload: { ...payload, ...(payload.overview ? { overview: { ...payload.overview, executive_summary: overviewExecutiveSummary(payload.overview.executive_summary, payload.overview.key_findings) } } : {}), captured_at:input.captured_at??null, generation_job_id: job.id },
  }, job.updated_at);
  if (decoded.errors.length) throw new TestingReadoutValidationError(`Saved ${decoded.records.size} periods; validation: ${decoded.errors.join(" ")}`);
  if (frameworkTests) await writeTestingReadoutCache({
    cache_key: "framework:v1", readout_type: "framework", period_label: null, period_start: null, period_end: null,
    comparison_label: null, comparison_start: null, comparison_end: null, prompt_version: promptVersion,
    payload: { schema_version: "1.0", test_frameworks: frameworkTests, channel_frameworks: frameworkTests.filter((test,index,all)=>all.findIndex(other=>other.channel===test.channel)===index), source_document: "https://docs.google.com/document/d/1XnlldsNeBzEy4J6c9qzVVnAiaLsEQrHBYpub1NgQuCU/edit", generation_job_id: job.id },
  }, job.updated_at);
  await markTestingReadoutPublished(job.id);
}
let publishing: Promise<void> | undefined;
export function publishCompletedTestingReadouts() {
  if (!publishing) {
    publishing = (async () => {
      const jobs = await completedTestingReadoutJobs();
      for (const job of jobs) {
        try { await publishTestingReadoutJob(job); }
        catch (error) {
          if (error instanceof TestingReadoutValidationError) await markTestingReadoutValidationError(job.id);
          else throw error;
        }
      }
    })().finally(() => { publishing = undefined; });
  }
  return publishing;
}
