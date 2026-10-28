import test from 'node:test';
import assert from 'node:assert/strict';
import {publishTestingData,TestingDataRefreshBusy,TestingDataRefreshRateLimit,type TestingDataQuery} from './testing-data-publication.ts';

test('a failed upstream refresh rolls back without changing the previous data or time',async()=>{
 const calls:string[]=[];
 const query:TestingDataQuery=async sql=>{calls.push(sql);return {rows:sql.includes('pg_try')?[{locked:true}]:[]};};
 await assert.rejects(()=>publishTestingData(query,'meta','period',async()=>{throw Error('API HTTP 429');}),/429/);
 assert.equal(calls.at(-1),'rollback');
 assert.equal(calls.some(sql=>sql.startsWith('insert')),false);
 assert.equal(calls.includes('commit'),false);
});
test('data and timestamp are published once only after all upstream reads succeed',async()=>{
 const calls:string[]=[];let saved:unknown;
 const query:TestingDataQuery=async(sql,params)=>{calls.push(sql);if(sql.includes('pg_try'))return{rows:[{locked:true}]};if(sql.startsWith('insert')){saved=params?.[2];return{rows:[{updated_at:'2026-10-28T11:00:00.000Z'}]};}return{rows:[]};};
 const result=await publishTestingData(query,'reddit','period',async()=>({data:{value:5},daily:[1,2]}));
 assert.deepEqual(JSON.parse(saved as string),{data:{value:5},daily:[1,2]});
 assert.equal(result.updatedAt,'2026-10-28T11:00:00.000Z');
 assert.equal(calls.at(-1),'commit');
});
test('concurrent or too-frequent requests never call the source or replace the snapshot',async()=>{
 for(const blocked of ['busy','recent'] as const){let fetched=false;const calls:string[]=[];
  const query:TestingDataQuery=async sql=>{calls.push(sql);if(sql.includes('pg_try'))return{rows:[{locked:blocked!=='busy'}]};if(sql.startsWith('select updated_at'))return{rows:[{recent:blocked==='recent'}]};return{rows:[]};};
  await assert.rejects(()=>publishTestingData(query,'meta','period',async()=>{fetched=true;return {}; }),blocked==='busy'?TestingDataRefreshBusy:TestingDataRefreshRateLimit);
  assert.equal(fetched,false);assert.equal(calls.at(-1),'rollback');assert.equal(calls.some(sql=>sql.startsWith('insert')),false);
 }
});
test('scheduled refresh skips a valid snapshot already published today without fetching or changing its timestamp',async()=>{
 const calls:string[]=[];let fetched=false;const snapshot={version:2,posts:[{id:'post'}]};
 const query:TestingDataQuery=async sql=>{calls.push(sql);if(sql.includes('pg_try'))return {rows:[{locked:true}]};if(sql.startsWith('select updated_at'))return {rows:[{utc_today:true,recent:false,updated_at:'2026-10-28T01:23:00.000Z',payload:snapshot}]};return {rows:[]};};
 const result=await publishTestingData(query,'social','all',async()=>{fetched=true;return {};},{skipValidToday:value=>value===snapshot});
 assert.equal(fetched,false);assert.equal(result.skipped,true);assert.equal(result.updatedAt,'2026-10-28T01:23:00.000Z');assert.equal(calls.at(-1),'commit');assert.equal(calls.some(sql=>sql.startsWith('insert')),false);
});
test('scheduled refresh fetches when last success was another UTC day or current payload is invalid',async()=>{
 for(const scenario of ['previous-day','invalid'] as const){let fetched=0;const calls:string[]=[];
  const query:TestingDataQuery=async sql=>{calls.push(sql);if(sql.includes('pg_try'))return{rows:[{locked:true}]};if(sql.startsWith('select updated_at'))return{rows:[{utc_today:scenario==='invalid',recent:false,updated_at:'2026-10-27T23:59:00.000Z',payload:{bad:true}}]};if(sql.startsWith('insert'))return{rows:[{updated_at:'2026-10-28T08:15:00.000Z'}]};return{rows:[]};};
  const result=await publishTestingData(query,'social','all',async()=>{fetched++;return {version:2};},{skipValidToday:value=>Boolean((value as {version?:number})?.version===2)});
  assert.equal(fetched,1);assert.equal(result.skipped,false);assert.equal(calls.filter(sql=>sql.startsWith('insert')).length,1);
 }
});
test('manual refresh still fetches when a snapshot was published today',async()=>{
 let fetched=0;const query:TestingDataQuery=async sql=>{if(sql.includes('pg_try'))return{rows:[{locked:true}]};if(sql.startsWith('select updated_at'))return{rows:[{recent:false,utc_today:true}]};if(sql.startsWith('insert'))return{rows:[{updated_at:'2026-10-28T09:00:00.000Z'}]};return{rows:[]};};
 const result=await publishTestingData(query,'social','all',async()=>{fetched++;return {version:2};});assert.equal(fetched,1);assert.equal(result.skipped,false);
});
test('concurrent scheduled runs cannot fetch twice and a later retry skips the committed snapshot',async()=>{
 let locked=false,fetches=0,stored:unknown=null;
 let started!:()=>void,release!:()=>void;
 const startedPromise=new Promise<void>(resolve=>{started=resolve;});const releasePromise=new Promise<void>(resolve=>{release=resolve;});
 const client=():TestingDataQuery=>async(sql,params)=>{
  if(sql.includes('pg_try')){if(locked)return{rows:[{locked:false}]};locked=true;return{rows:[{locked:true}]};}
  if(sql.startsWith('select updated_at'))return{rows:stored?[{utc_today:true,recent:true,updated_at:'2026-10-28T08:15:00.000Z',payload:stored}]:[]};
  if(sql.startsWith('insert')){stored=JSON.parse(params![2] as string);return{rows:[{updated_at:'2026-10-28T08:15:00.000Z'}]};}
  if(sql==='commit'||sql==='rollback')locked=false;
  return{rows:[]};
 };
 // Give the rejected contender its own client: its rollback must not release the first client's lock.
 const contender:TestingDataQuery=async sql=>sql.includes('pg_try')?{rows:[{locked:false}]}:{rows:[]};
 const load=async()=>{fetches++;started();await releasePromise;return {version:2,posts:[{}]};};
 const valid=(value:unknown)=>Boolean((value as {version?:number})?.version===2);
 const first=publishTestingData(client(),'social','all',load,{skipValidToday:valid});await startedPromise;
 await assert.rejects(()=>publishTestingData(contender,'social','all',load,{skipValidToday:valid}),TestingDataRefreshBusy);
 release();await first;
 const retry=await publishTestingData(client(),'social','all',load,{skipValidToday:valid});
 assert.equal(retry.skipped,true);assert.equal(fetches,1);
});

test('Google publishes all channels with exactly one timestamp after complete success',async()=>{
 const {publishGoogleTestingData}=await import('./testing-data-publication.ts');
 const calls:string[]=[],timestamps:unknown[]=[];let loaded=0;
 const query:TestingDataQuery=async(sql,params)=>{calls.push(sql);if(sql.includes('pg_try'))return{rows:[{locked:true}]};if(sql==='select clock_timestamp() as updated_at')return{rows:[{updated_at:'2026-10-28T18:00:00Z'}]};if(sql.startsWith('insert')){assert.equal(loaded,3);timestamps.push(params?.[3]);}return{rows:[]};};
 const result=await publishGoogleTestingData(query,async channel=>{loaded++;return {channel};});
 assert.equal(new Set(timestamps).size,1);assert.equal(timestamps.length,3);assert.equal(result.updatedAt,'2026-10-28T18:00:00.000Z');assert.equal(calls.at(-1),'commit');
});
test('Google batch failure never writes any new snapshot or time',async()=>{
 const {publishGoogleTestingData}=await import('./testing-data-publication.ts');const calls:string[]=[];
 const query:TestingDataQuery=async sql=>{calls.push(sql);return{rows:sql.includes('pg_try')?[{locked:true}]:[]};};
 await assert.rejects(()=>publishGoogleTestingData(query,async channel=>{if(channel==='google-demand-gen')throw Error('upstream failed');return{};}),/upstream failed/);
 assert.equal(calls.some(sql=>sql.startsWith('insert')),false);assert.equal(calls.at(-1),'rollback');
});
test('first-visit initialization reuses a concurrent publication without another API call',async()=>{
 let loaded=false;
 const query:TestingDataQuery=async sql=>({rows:sql.includes('pg_try')?[{locked:true}]:sql.startsWith('select updated_at,payload')?[{updated_at:'2026-10-28T18:00:00Z',payload:{data:1}}]:[]});
 const result=await publishTestingData(query,'meta','period',async()=>{loaded=true;return{};},{reuseExisting:true});
 assert.equal(loaded,false);assert.equal(result.skipped,true);assert.deepEqual(result.payload,{data:1});
});
test('a Google write error rolls back the whole batch even after a first staged write',async()=>{
 const {publishGoogleTestingData}=await import('./testing-data-publication.ts');const calls:string[]=[];let inserts=0;
 const query:TestingDataQuery=async sql=>{calls.push(sql);if(sql.includes('pg_try'))return{rows:[{locked:true}]};if(sql==='select clock_timestamp() as updated_at')return{rows:[{updated_at:'2026-10-28T18:00:00Z'}]};if(sql.startsWith('insert')&&++inserts===2)throw Error('database write failed');return{rows:[]};};
 await assert.rejects(()=>publishGoogleTestingData(query,async()=>({})),/database write failed/);assert.equal(inserts,2);assert.equal(calls.includes('commit'),false);assert.equal(calls.at(-1),'rollback');
});
