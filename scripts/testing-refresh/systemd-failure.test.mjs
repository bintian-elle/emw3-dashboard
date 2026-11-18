import test from 'node:test';
import assert from 'node:assert/strict';
import {failureAlreadyReported, failureMessage} from './systemd-failure-policy.mjs';
import {shouldSkipReportDay} from './policy.mjs';

test('a failure already reported by the task is not sent twice',()=>{
 assert.equal(failureAlreadyReported('emw3-content-testing-reports.service',{error:'failed',failureSent:'time'}),true);
 assert.equal(failureAlreadyReported('emw3-testing-data-refresh.service',{items:{meta:{error:'failed'}},notifiedKeys:{meta:'time'}}),true);
 assert.equal(failureAlreadyReported('emw3-testing-data-refresh.service',{items:{meta:{error:'failed'},reddit:{error:'failed'}},notifiedKeys:{meta:'time'}}),false);
 assert.equal(failureAlreadyReported('emw3-content-testing-reports.service',{}),false);
});

test('a one-day skip suppresses only the explicitly selected report day',()=>{
 assert.equal(shouldSkipReportDay('2026-11-11','2026-11-11'),true);
 assert.equal(shouldSkipReportDay('2026-11-12','2026-11-11'),false);
 assert.equal(shouldSkipReportDay('2026-11-11',undefined),false);
});

test('fallback notification contains only an allowlisted task and safe status',()=>{
 assert.match(failureMessage('emw3-ai-insights-refresh.service','timeout'),/timeout/);
 assert.throws(()=>failureMessage('unknown.service','failed'));
 assert.doesNotMatch(failureMessage('emw3-ai-insights-refresh.service','secret=private'),/private/);
});

test('EDM waits for its retry and avoids duplicating delivered failure notifications',()=>{
 const started=Date.parse('2026-11-19T09:00:00Z'),updatedAt='2026-11-19T09:10:00Z';
 assert.equal(!!failureAlreadyReported('emw3-edm-refresh.service',{updatedAt,attempts:1,success:false,outcomes:{metrics:{ok:false}}},started),true);
 assert.equal(!!failureAlreadyReported('emw3-edm-refresh.service',{updatedAt,attempts:2,success:false,outcomes:{}},started),false);
 assert.equal(!!failureAlreadyReported('emw3-edm-refresh.service',{updatedAt,attempts:2,failureSentAt:updatedAt},started),true);
 assert.match(failureMessage('emw3-edm-refresh.service','exit-code'),/EDM/);
});
