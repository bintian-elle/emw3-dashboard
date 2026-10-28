import test from 'node:test';import assert from 'node:assert/strict';import {easternClock,dueAttempt,collectionPlan,safeReason} from './policy.mjs';
test('Eastern schedules keep local hour over DST transitions',()=>{
 assert.equal(easternClock(new Date('2026-10-28T08:00:00Z')).hour,4);
 assert.equal(easternClock(new Date('2026-11-02T09:00:00Z')).hour,4);
});
test('only retries other channels in the 05:00 window, with no third API attempt',()=>{
 const now=Date.parse('2026-10-28T09:00:00Z');assert.equal(dueAttempt({},3,4,now),false);
 assert.equal(dueAttempt({},4,4,now),true);assert.equal(dueAttempt({success:true},5,4,now),false);
 assert.equal(dueAttempt({attempts:1,lastAttempt:'2026-10-28T08:00:05Z'},5,4,now),true);
 assert.equal(dueAttempt({attempts:1,lastAttempt:'2026-10-28T09:00:05Z'},5,4,now),false);
 assert.equal(dueAttempt({attempts:2},5,4,now),false);assert.equal(dueAttempt({attempts:1},6,4,now),false);
 assert.equal(dueAttempt({attempts:1},6,5,now,'google'),false);
});
test('refreshes every required period and both lifetime sources',()=>{
 const plan=collectionPlan();assert.equal(plan.length,11);assert.ok(plan.some(i=>i.key==='reddit:sinceSep24'));
 assert.ok(plan.filter(i=>i.period==='lastWeek').every(i=>i.weekly));
});
test('failure notifications redact credentials',()=>assert.equal(safeReason('Bearer secret access_token=123'),'Bearer [redacted] access_token=[redacted]'));
test('connection failures include their underlying cause in the alert',()=>assert.match(safeReason(new Error('fetch failed',{cause:{code:'ECONNREFUSED'}})),/ECONNREFUSED/));
