import test from 'node:test';import assert from 'node:assert/strict';
import {trackingRefreshCircuit} from './website-tracking-circuit.mjs';
test('exhausted shared quota or transport stops later scopes without replacing their caches',()=>{
 for(const code of ['rate_limited','network_error','upstream_unavailable','authentication_failed','permission_denied','queue_timeout']){
  const circuit=trackingRefreshCircuit();assert.equal(circuit.skipped('all','overview'),undefined);
  circuit.failure('all','overview',{code,elapsedSeconds:120});
  assert.deepEqual(circuit.skipped('mobile','collection'),{code,elapsedSeconds:120,device:'mobile',scope:'collection',skippedAfterSharedFailure:true});
  assert.equal(trackingRefreshCircuit().skipped('mobile','collection'),undefined);
 }
});
test('a report-specific incomplete result does not block other snapshots',()=>{
 const circuit=trackingRefreshCircuit();circuit.failure('all','overview',{code:'incomplete_report'});
 assert.equal(circuit.skipped('desktop','collection'),undefined);
});
