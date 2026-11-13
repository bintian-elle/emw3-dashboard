import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {trackingFailure,reportFailure} from './website-tracking-errors.ts';
import {refreshTrackingCache,readTrackingCache,trackingCachePaths} from './website-tracking-cache.ts';
test('diagnostics classify known errors without persisting arbitrary text',()=>{
 assert.equal(trackingFailure(Error('GA4 query timed out. Bearer SECRET')).code,'query_timeout');
 assert.doesNotMatch(JSON.stringify(trackingFailure(Error('password=SECRET https://private'))),/SECRET|https/);
 assert.deepEqual(reportFailure({features:{coupons:{error:'GA4 query timed out. password=SECRET'}}}),{code:'query_timeout',reason:'GA4 query exceeded its execution time limit.',section:'features.coupons'});
});
test('failed report records section and category, preserves exact good snapshot, successful refresh clears failure',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'tracking-diagnostics-'));
 const period={start:'2026-11-01',end:'2026-11-07'},now=Date.now();
 const report=()=>({rows:[],warnings:[]});
 const data=()=>({overview:report(),devices:report(),events:report(),actions:report(),lists:report(),purchases:report(),property:'451107071',fetchedAt:new Date(now).toISOString()});
 try{
  assert.equal(await refreshTrackingCache(period,'all',async()=>data(),{directory,now}),true);
  const files=trackingCachePaths(period,'all',directory),original=await readFile(files.snapshot,'utf8');
  const bad={...data(),actions:{rows:[],warnings:[],error:'GA4 query timed out. Bearer SECRET'}};
  assert.equal(await refreshTrackingCache(period,'all',async()=>bad,{directory,now:now+1,force:true}),false);
  assert.equal(await readFile(files.snapshot,'utf8'),original);
  const state=await readTrackingCache(period,'all',{directory,now:now+1});assert.equal(state.failure?.code,'query_timeout');assert.equal(state.failure?.section,'actions');
  assert.doesNotMatch(await readFile(files.failure,'utf8'),/SECRET|Bearer/);
  assert.equal(await refreshTrackingCache(period,'all',async()=>data(),{directory,now:now+2,force:true}),true);
  assert.equal((await readTrackingCache(period,'all',{directory,now:now+2})).error,undefined);
 }finally{await rm(directory,{recursive:true,force:true});}
});
