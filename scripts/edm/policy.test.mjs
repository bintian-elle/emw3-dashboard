import test from 'node:test';import assert from 'node:assert/strict';import {resolveWindow,dueAttempt,recordResult,tryPendingNotice,assertInsightCoverage} from './policy.mjs';
test('daily schedule has at most two attempts separated by an hour and skips a successful day',()=>{
 const at=new Date('2026-11-19T09:00:00Z');assert.equal(dueAttempt({},at),true);const s={day:'2026-11-19',attempts:1,lastAttempt:at.toISOString()};assert.equal(dueAttempt(s,new Date('2026-11-19T09:30:00Z')),false);assert.equal(dueAttempt(s,new Date('2026-11-19T10:00:00Z')),true);assert.equal(dueAttempt({...s,attempts:2},new Date('2026-11-19T11:00:00Z')),false);assert.equal(dueAttempt({...s,success:true},new Date('2026-11-19T10:00:00Z')),false);
});
test('EDM insights cannot use a newer metric date to hide another incomplete domain',()=>{
 const now=new Date('2026-11-19T10:30:00Z'),rows=['metrics','flows','campaigns','links','subscribers'].map(domain=>({domain,end_day:'2026-11-19'}));assert.doesNotThrow(()=>assertInsightCoverage(rows,now));assert.throws(()=>assertInsightCoverage(rows.slice(1),now),/incomplete/);assert.throws(()=>assertInsightCoverage(rows.map(r=>r.domain==='flows'?{...r,end_day:'2026-11-18'}:r),now),/incomplete/);
});
test('ordinary timer jitter cannot suppress the five oclock retry',()=>{
 assert.equal(dueAttempt({day:'2026-11-19',attempts:1,lastAttempt:'2026-11-19T09:00:02Z'},new Date('2026-11-19T10:00:00Z')),true);
});
test('Slack downtime leaves notices pending without blocking new collection',async()=>{
 const state={success:true,pendingRecovery:true,through:'2026-11-17',outcomes:Object.fromEntries(['metrics','flows','campaigns','links','subscribers'].map(k=>[k,{ok:true}]))};const result=await tryPendingNotice(state,{save:async()=>{},send:async()=>{throw Error('Slack offline');}});assert.equal(result.deferred,true);assert.equal(result.state.pendingRecovery,true);
});
test('backfill ends before the current Eastern day and never alters pre-migration history',()=>{
 assert.deepEqual(resolveWindow(new Date('2026-11-18T22:00:00Z')),{start:'2026-11-10',end:'2026-11-18'});assert.throws(()=>resolveWindow(new Date('2026-11-18T22:00:00Z'),{start:'2026-11-10',end:'2026-11-19'}),/complete/);
});
test('partial collection remains an incident; recovery requires every domain and delivered notification',async()=>{
 const saved=[],sent=[];const common={save:async s=>saved.push(structuredClone(s)),send:async m=>sent.push(m),now:new Date('2026-11-18T22:00:00Z')};let s=await recordResult({}, {metrics:{ok:true},flows:{ok:false,error:'Klaviyo HTTP 429'}},{...common,through:'2026-11-17',notifyFailure:true});assert.equal(s.success,false);assert.equal(s.pendingRecovery,true);assert.equal(sent.length,1);
 const success=Object.fromEntries(['metrics','flows','campaigns','links','subscribers'].map(k=>[k,{ok:true}]));await assert.rejects(()=>recordResult(s,success,{...common,through:'2026-11-17',send:async()=>{throw Error('delivery failed');}}));assert.equal(saved.at(-1).pendingRecovery,true);
 s=await recordResult(s,success,{...common,through:'2026-11-17'});assert.equal(s.pendingRecovery,false);assert.ok(s.recoverySentAt);assert.equal(sent.length,2);
});
