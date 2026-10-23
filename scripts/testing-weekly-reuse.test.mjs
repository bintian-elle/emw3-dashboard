import test from 'node:test';
import assert from 'node:assert/strict';
import { omitSavedLastWeek, prepareTestingWeeklyReuse } from './testing-weekly-reuse.mjs';
const make = () => ({ id: 'testing-readouts:2026-10-24:content-testing-v5:cbd3d8810198', status: 'queued', remote_id: null, body: {
  mode: 'testing_readout', dashboard_id: 'bluevua-content-testing', analysis_payload: { prompt_version: 'content-testing-v5', regenerate_framework: false,
  creative_catalog: { Campaign: { spend: 1 } }, periods: [
    { period: { label: 'Last Week (Tue–Mon)', start: '2026-10-13', end: '2026-10-19' }, tests: [{ test_id: 'Campaign', data: { spend: 1 } }] },
    { period: { label: 'Week-to-date', start: '2026-10-20', end: '2026-10-23' }, tests: [{ test_id: 'Campaign', data: { spend: 3 } }] },
  ] } } });

test('reuses weekly only, preserving daily periods and replacing duplicate catalog metrics', () => {
  const body = make().body, original = structuredClone(body), result = omitSavedLastWeek(body);
  assert.deepEqual(body, original);
  assert.equal(result.analysis_payload.periods.length, 1);
  assert.equal(result.analysis_payload.periods[0].period.label, 'Week-to-date');
  assert.equal(result.analysis_payload.creative_catalog.Campaign.spend, 3);
  assert.equal(result.analysis_payload.reused_weekly_periods[0].end, '2026-10-19');
});

test('missing weekly cache or matching published prompt revision keeps full job for catch-up', async () => {
  for (const replies of [[0], [1, 0]]) {
    const job = make(), before = structuredClone(job), calls = [];
    await prepareTestingWeeklyReuse({ query: async (...args) => { calls.push(args); return { rowCount: replies.shift() }; } }, job);
    assert.deepEqual(job, before);
    assert.equal(calls.length <= 2, true);
  }
});

test('published exact range and revision are required before job body is updated', async () => {
  const job = make(), calls = [];
  await prepareTestingWeeklyReuse({ query: async (...args) => { calls.push(args); return { rowCount: 1 }; } }, job);
  assert.equal(calls.length, 3);
  assert.match(calls[1][1][0], /content-testing-v5:cbd3d8810198$/);
  assert.deepEqual(JSON.parse(calls[1][1][3]), [{ period: { label: 'Last Week (Tue–Mon)', start: '2026-10-13', end: '2026-10-19' } }]);
  assert.equal(job.body.analysis_payload.periods.length, 1);
});

test('running/submitted jobs and framework regeneration are never rewritten', async () => {
  for (const override of [{ status: 'running' }, { remote_id: 'native' }, { regenerate: true }]) {
    const job = Object.assign(make(), override);
    if (override.regenerate) job.body.analysis_payload.regenerate_framework = true;
    await prepareTestingWeeklyReuse({ query: async () => { throw Error('Unexpected DB call'); } }, job);
    assert.equal(job.body.analysis_payload.periods.length, 2);
  }
});
