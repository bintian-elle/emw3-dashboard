// A weekly snapshot is reusable only for the exact range and prompt revision.
// This runs before first submission; already-running jobs are never rewritten.
export function omitSavedLastWeek(body) {
  const payload = body.analysis_payload;
  const weekly = payload?.periods?.find(p => p.period.label === 'Last Week (Tue–Mon)');
  if (!weekly) return body;
  const periods = payload.periods.filter(p => p !== weekly);
  if (!periods.length) return body;
  const catalog = { ...payload.creative_catalog };
  for (const test of weekly.tests) {
    if (JSON.stringify(catalog[test.test_id]) !== JSON.stringify(test.data)) continue;
    const replacement = periods.flatMap(p => p.tests).find(t => t.test_id === test.test_id);
    if (replacement) catalog[test.test_id] = replacement.data;
  }
  return { ...body, analysis_payload: { ...payload, periods, creative_catalog: catalog,
    reused_weekly_periods: [{ ...weekly.period, reason: 'Exact published weekly period and prompt revision already available.' }] } };
}

export async function prepareTestingWeeklyReuse(client, job) {
  if (job.status !== 'queued' || job.remote_id || job.body.mode !== 'testing_readout' || job.body.dashboard_id !== 'bluevua-content-testing') return;
  const match = /^testing-readouts:\d{4}-\d{2}-\d{2}:([a-z0-9-]+):([a-f0-9]{12})$/.exec(job.id);
  const payload = job.body.analysis_payload;
  const weekly = payload?.periods?.find(p => p.period.label === 'Last Week (Tue–Mon)');
  if (!match || !weekly || payload.regenerate_framework) return;
  const key = `period:last-week-tue-mon:${weekly.period.start}:${weekly.period.end}`;
  const saved = await client.query('select 1 from testing_ai_readout_cache where cache_key=$1 and prompt_version=$2', [key, payload.prompt_version]);
  if (!saved.rowCount) return;
  const prior = await client.query(`select 1 from ai_job_queue where id like $1 and status=$2 and result->>$3 is not null and body->'analysis_payload'->'periods' @> $4::jsonb limit 1`,
    [`testing-readouts:%:${match[1]}:${match[2]}`, 'completed', 'testing_cache_published_at', JSON.stringify([{ period: weekly.period }])]);
  if (!prior.rowCount) return;
  const next = omitSavedLastWeek(job.body);
  if (next === job.body) return;
  await client.query('update ai_job_queue set body=$2::jsonb,updated_at=now() where id=$1', [job.id, JSON.stringify(next)]);
  job.body = next;
  console.log(JSON.stringify({ status: 'reused_last_week', id: job.id, cacheKey: key }));
}
