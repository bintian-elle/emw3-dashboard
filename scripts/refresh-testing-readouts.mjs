import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const secret = process.env.CRON_SECRET?.trim() || process.env.AI_WORKER_SECRET?.trim();
if (!secret) throw new Error('An internal refresh secret is not configured.');
// Never send this credential to AUTH_URL or a browser-supplied host.
const endpoint = 'http://127.0.0.1:3000/api/testing/readouts/refresh';
const deadline = Date.now() + 90 * 60 * 1000;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let lastStatus, transportFailures = 0;
while (Date.now() < deadline) {
  let response, payload;
  try {
    response = await fetch(endpoint, { method: 'POST', headers: { authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ translationsOnly: process.argv.includes('--translations-only') }), signal: AbortSignal.timeout(240000) });
    const text = await response.text();
    try { payload = JSON.parse(text); } catch { throw new Error(`Testing refresh returned a non-JSON response (HTTP ${response.status}).`); }
  } catch (error) {
    if (++transportFailures > 3) throw error;
    console.log(JSON.stringify({ status: 'transport_retry', attempt: transportFailures }));
    await pause(15000);
    continue;
  }
  transportFailures = 0;
  if (!response.ok) throw new Error(payload.error || `Testing refresh HTTP ${response.status}`);
  if (!payload.pending) { console.log(JSON.stringify(payload)); if (payload.errors?.length) throw new Error('Some translated readouts failed validation; English analysis remains available.'); process.exit(0); }
  if (payload.status !== lastStatus) console.log(JSON.stringify({ status: payload.status, jobId: payload.jobId }));
  lastStatus = payload.status;
  await pause(30000);
}
throw new Error('Testing generation is still pending after 90 minutes; the persisted task and completed results remain recoverable.');
