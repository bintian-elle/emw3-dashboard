import test from 'node:test';
import assert from 'node:assert/strict';
import {ga4EnvelopeError,GA4_TRANSPORT_TIMEOUT_MS} from './website-tracking-transport.ts';
import {trackingFailure,trackingError} from './website-tracking-errors.ts';
import {trackingReportReader} from './website-tracking-reader.ts';

test('CLI failure codes and bounded timing evidence survive without leaking raw messages',()=>{
 for(const [status,expected] of [['queue_timeout','queue_timeout'],['timeout','query_timeout'],['auth_failed','authentication_failed'],['throttled','rate_limited'],['transport_error','network_error'],['scope_missing','permission_denied']]){
  const error=ga4EnvelopeError({status,message:'Bearer SECRET https://private',queue_wait_seconds:45.429,elapsed_seconds:120.001,http_status:429});
  const failure=trackingFailure(error);
  assert.equal(failure.code,expected);assert.equal(failure.queueWaitSeconds,45.429);assert.equal(failure.httpStatus,429);assert.doesNotMatch(error.message,/SECRET|https/);
 }
 assert.ok(GA4_TRANSPORT_TIMEOUT_MS>240000);
 const invalid=ga4EnvelopeError({status:'secret',queue_wait_seconds:'SECRET',elapsed_seconds:Infinity,http_status:'secret'});
 assert.doesNotMatch(invalid.message,/SECRET|Infinity|secret/);
});

test('failed shared query stops redundant requests for the same snapshot and preserves an error result',async()=>{
 let calls=0;
 const transport={query:async()=>{calls++;throw trackingError('queue_timeout',{queueWaitSeconds:120,elapsedSeconds:120});},readExport:async()=>''};
 const reader=await trackingReportReader({start:'2026-11-01',end:'2026-11-07'},'all',transport);
 const first=await reader.report([],['totalUsers']);
 const second=await reader.report(['eventName'],['eventCount']);
 assert.equal(calls,1);assert.ok(first.error);assert.equal(second.error,first.error);
 assert.equal(trackingFailure(second.error).code,'queue_timeout');
 assert.equal(trackingFailure(second.error).queueWaitSeconds,120);
});

test('a later snapshot gets a fresh reader and can recover after the first failed query',async()=>{
 let calls=0;
 const transport={query:async()=>{calls++;if(calls===1)throw trackingError('query_timeout');return {status:'ok',resource_id:'451107071',data:[{totalUsers:7}]};},readExport:async()=>''};
 const period={start:'2026-11-01',end:'2026-11-07'};
 const first=await trackingReportReader(period,'all',transport);assert.ok((await first.report([],['totalUsers'])).error);
 const next=await trackingReportReader(period,'all',transport);const result=await next.report([],['totalUsers']);
 assert.equal(result.error,undefined);assert.equal(result.rows[0].metrics[0],7);
});
