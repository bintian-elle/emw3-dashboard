export class TestingReadoutValidationError extends Error {}

export type ReadoutPeriod = { label: string; start: string; end: string; concludedTestId?: string };
export const readoutPeriodSlugs: Record<string, string> = {
  "Last Week (Tue–Mon)": "last-week-tue-mon", "Week-to-date": "week-to-date", "Month-to-date": "month-to-date", "Lifetime snapshot": "social-lifetime",
};
export function testingReadoutKey(period: ReadoutPeriod) {
  if (period.concludedTestId) {
    if (!/^[a-z0-9-]+$/.test(period.concludedTestId)) throw new Error("Invalid concluded test ID");
    return `period:concluded:${period.concludedTestId}`;
  }
  if (period.label === "Lifetime (Sep 24, 2026 – Now)") return "period:reddit-lifetime";
  if (period.label === "Lifetime snapshot") return "period:social-lifetime";
  const slug = readoutPeriodSlugs[period.label];
  return slug ? `period:${slug}:${period.start}:${period.end}` : null;
}
export type CachedTestReadout = {
  test_id: string; channel?: string; campaign_name?: string | null; summary: string | null;
  confidence?: string; recommended_action?: string | null; data_gaps?: string[]; asset_insights?: string[]; evidence?: string[];
  delta?: { comparison_label?: string | null; metrics?: Array<{ name: string; unit?: string; test_value?: number | null; comparison_value?: number | null; absolute_delta?: number | null; relative_delta_pct?: number | null; percentage_point_delta?: number | null; interpretation?: string | null }> };
};
export type CachedPeriodReadout = {
  schema_version: string; run_mode: "period_readout"; period: ReadoutPeriod; captured_at?:string|null;
  overview?: { executive_summary?: string | null; key_findings?: string[]; recommended_actions?: string[]; data_gaps?: string[] };
  tests: CachedTestReadout[];
};
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
export function decodeTestingReadouts(result: unknown, expected: ReadoutPeriod[], identities: Record<string, string[]>, requirements?: Record<string,string[]>) {
  if (!object(result) || result.run_mode !== "period_readout_batch" || result.schema_version !== "1.0" || !Array.isArray(result.period_readouts)) throw new TestingReadoutValidationError("Testing result is missing its dedicated batch schema.");
  const records = new Map<string, CachedPeriodReadout>();
  const errors: string[] = [];
  for (const item of result.period_readouts) {
    try {
      const payload: unknown = item;
      if (!object(payload) || payload.run_mode !== "period_readout" || payload.schema_version !== "1.0" || !object(payload.period) || !Array.isArray(payload.tests)) throw new Error("Invalid testing readout schema.");
      const actualPeriod = payload.period;
      const period = expected.find(p => p.label === actualPeriod.label && p.start === actualPeriod.start && p.end === actualPeriod.end);
      if (!period) throw new Error("Unexpected reporting dates or label.");
      const key = testingReadoutKey(period)!;
      if (records.has(key)) throw new Error("Duplicate period result.");
      if(requirements && period.label!=="Lifetime snapshot" && period.label!=="Lifetime (Sep 24, 2026 – Now)"){
        if(!object(payload.overview)||typeof payload.overview.executive_summary!=='string'||!Array.isArray(payload.overview.key_findings)||!payload.overview.key_findings.length||!Array.isArray(payload.overview.recommended_actions)||!payload.overview.recommended_actions.length)throw new Error('Overview requires a summary, key insights and optimization recommendations.');
        const text=JSON.stringify(payload.overview);
        for(const id of requirements.Overview??[])if(!text.includes(id))throw new Error(`Missing Overview requirement ${id}`);
      }
      const seen = new Set<string>();
      for (const test of payload.tests) {
        if (!object(test) || typeof test.test_id !== "string" || seen.has(test.test_id) || !identities[key]?.includes(test.test_id) || !(test.summary === null || typeof test.summary === "string")) throw new Error("Unknown, duplicate or invalid test identity.");
        seen.add(test.test_id);
        if(requirements){
          if(typeof test.summary!=="string" || !test.summary.trim())throw new Error(`Missing substantive summary for ${test.test_id}`);
          const checklist=requirements[String(test.channel)];
          if(!checklist)throw new Error(`Unknown analysis channel for ${test.test_id}`);
          const text=JSON.stringify(test);
          for(const id of checklist)if(!text.includes(id))throw new Error(`Missing ${test.test_id} requirement ${id}`);
          if(typeof test.recommended_action!=='string'||!test.recommended_action.trim())throw new Error(`Missing optimization recommendation for ${test.test_id}`);
          if(test.channel==='Google PMAX'&&typeof test.summary==='string'){
            const words=test.summary.trim().split(/\s+/).length;
            if(words<50||words>70)throw new Error(`PMax summary must contain 50–70 words: ${test.test_id} has ${words}`);
          }
        }
        if (test.delta != null) {
          if (!object(test.delta) || !Array.isArray(test.delta.metrics)) throw new Error("Invalid delta metrics.");
          for (const metric of test.delta.metrics) {
            if (!object(metric) || typeof metric.name !== "string") throw new Error("Invalid delta metric.");
            for (const field of ["test_value", "comparison_value", "absolute_delta", "relative_delta_pct", "percentage_point_delta"]) {
              if (metric[field] != null && (typeof metric[field] !== "number" || !Number.isFinite(metric[field]))) throw new Error("Non-numeric delta.");
            }
            const a = metric.test_value as number | null, b = metric.comparison_value as number | null;
            const close = (actual: unknown, correct: number | null) => actual == null || (correct != null && Math.abs(Number(actual) - correct) <= Math.max(0.02, Math.abs(correct) * 0.002));
            if (!close(metric.absolute_delta, a == null || b == null ? null : a - b) || !close(metric.relative_delta_pct, a == null || !b ? null : (a - b) / b * 100) || !close(metric.percentage_point_delta, a == null || b == null ? null : a - b)) throw new Error("Delta arithmetic does not match its source values.");
          }
        }
      }
      if (seen.size !== identities[key]?.length) throw new Error(`Incomplete test coverage for ${period.label}.`);
      records.set(key, { ...payload, period } as CachedPeriodReadout);
    } catch (error) { errors.push(error instanceof Error ? error.message : "Invalid testing result."); }
  }
  for (const period of expected) if (!records.has(testingReadoutKey(period)!)) errors.push(`Missing ${period.label} (${period.start}–${period.end}).`);
  return { records, errors };
}

export function generatedFramework(tests: CachedTestReadout[]) {
  return tests.map(test => {
    const raw = test.evidence?.find(value => value.startsWith("[FRAMEWORK] "));
    if (!raw) throw new TestingReadoutValidationError(`Missing generated framework for ${test.test_id}`);
    let value: unknown;
    try { value = JSON.parse(raw.slice("[FRAMEWORK] ".length)); }
    catch { throw new TestingReadoutValidationError(`Invalid framework JSON for ${test.test_id}`); }
    if (!object(value) || typeof value.goal!=="string" || !value.goal.trim() || typeof value.hypothesis!=="string" || !value.hypothesis.trim() || typeof value.hypothesisBasis!=="string" || !["documented", "inferred", "unavailable"].includes(value.hypothesisBasis)) throw new TestingReadoutValidationError(`Incomplete framework for ${test.test_id}`);
    return { test_id: test.test_id, channel: test.channel, campaign_name: test.campaign_name, test_goal: value.goal, hypothesis: { text: value.hypothesis, basis: value.hypothesisBasis } };
  });
}
