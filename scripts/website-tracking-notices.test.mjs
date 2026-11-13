import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {recordTrackingRun,trackingFailureDetails} from './website-tracking-notices.mjs';
test('failure survives restarts and date changes; recovery is sent once only after all eight succeed',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'tracking-notices-'));const messages=[];const send=async m=>messages.push(m);
 try{
  await recordTrackingRun({failed:1,refreshed:7,failures:[{device:'mobile',scope:'overview',code:'query_timeout',section:'actions'}]},{directory,send});
  assert.equal(messages.length,0);
  await recordTrackingRun({failed:0,refreshed:7},{directory,send});assert.equal(messages.length,0);
  await assert.rejects(recordTrackingRun({failed:0,refreshed:8},{directory,send:async()=>{throw Error('offline');}}));
  assert.equal(JSON.parse(await readFile(path.join(directory,'status.json'),'utf8')).pendingRecovery,true);
  await recordTrackingRun({failed:0,refreshed:8},{directory,send});assert.equal(messages.length,1);
  await recordTrackingRun({failed:0,refreshed:8},{directory,send});assert.equal(messages.length,1);
  await recordTrackingRun({failed:1,refreshed:7},{directory,send});
  await recordTrackingRun({failed:0,refreshed:8},{directory,send});assert.equal(messages.length,2);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('failure details reject stale records and cannot expose arbitrary persisted secrets',()=>{
 const state={failed:1,updatedAt:new Date().toISOString(),failures:[{device:'mobile',scope:'overview',code:'query_timeout',section:'actions',reason:'Bearer secret',stack:'private'}, {device:'token=secret',scope:'https://private',code:'private',section:'secret=123'}]};
 const text=trackingFailureDetails(state,0);assert.match(text,/mobile \/ overview: query_timeout \(actions\)/);assert.doesNotMatch(text,/secret|private|Bearer/);
 assert.equal(trackingFailureDetails(state,Date.now()+1000),'');
});

test('alerts contain precise safe GA4 cause and numeric queue timing only',()=>{
 const text=trackingFailureDetails({failed:1,updatedAt:new Date().toISOString(),failures:[{device:'all',scope:'overview',code:'queue_timeout',section:'overview',queueWaitSeconds:45.429,elapsedSeconds:120.001,httpStatus:429,reason:'SECRET Bearer private'}]},0);
 assert.match(text,/queue_timeout/);assert.match(text,/排队 45.4s/);assert.match(text,/总耗时 120s/);assert.match(text,/HTTP 429/);assert.doesNotMatch(text,/SECRET|Bearer|private/);
});
