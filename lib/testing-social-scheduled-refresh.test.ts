import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleScheduledSocialRefresh} from './testing-social-scheduled-refresh.ts';
import {TestingDataRefreshBusy,TestingDataRefreshRateLimit} from './testing-data-publication.ts';

const request=(authorization?:string)=>new Request('http://127.0.0.1/api/testing/social-refresh',{method:'POST',headers:authorization?{authorization}:{}});

test('service authentication rejects missing and incorrect credentials before fetching',async()=>{
 let calls=0;const refresh=async()=>{calls++;return {updatedAt:'2026-10-28T08:15:00.000Z'};};
 assert.equal((await handleScheduledSocialRefresh(request(),undefined,refresh,()=>{})).status,503);
 assert.equal((await handleScheduledSocialRefresh(request('Bearer wrong'),'test-secret',refresh,()=>{})).status,401);
 assert.equal(calls,0);
});
test('successful publication returns committed time even if revalidation fails',async()=>{
 const response=await handleScheduledSocialRefresh(request('Bearer test-secret'),'test-secret',async()=>({updatedAt:'2026-10-28T08:15:00.000Z'}),()=>{throw Error('revalidation failed');});
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{updatedAt:'2026-10-28T08:15:00.000Z',skipped:false});
});
test('a scheduled skip returns the original timestamp and does not revalidate',async()=>{
 let revalidated=false;
 const response=await handleScheduledSocialRefresh(request('Bearer test-secret'),'test-secret',async()=>({updatedAt:'2026-10-28T08:15:00.000Z',skipped:true}),()=>{revalidated=true;});
 assert.deepEqual(await response.json(),{updatedAt:'2026-10-28T08:15:00.000Z',skipped:true});assert.equal(revalidated,false);
});
test('limits and source failures return safe errors without implying a successful publication',async()=>{
 for(const [error,status] of [[new TestingDataRefreshBusy(),429],[new TestingDataRefreshRateLimit(),429],[Error('API HTTP 429'),429],[Error('sensitive upstream detail'),503]] as const){
  let revalidated=false;
  const response=await handleScheduledSocialRefresh(request('Bearer test-secret'),'test-secret',async()=>{throw error;},()=>{revalidated=true;});
  assert.equal(response.status,status);assert.equal(revalidated,false);
  const body=JSON.stringify(await response.json());assert.match(body,/Existing data is unchanged/);assert.doesNotMatch(body,/sensitive upstream detail/);
 }
});
