import test from 'node:test';import assert from 'node:assert/strict';
import {runScheduledReports} from './scheduled-reports.mjs';
import {REPORT_CHANNELS} from './report-readiness.mjs';
const records=Object.fromEntries(REPORT_CHANNELS.map(c=>[c,{success:true,updatedAt:'2026-12-01T11:30:00Z'}]));
test('does not generate any reports if one source is not current',async()=>{let calls=0;await assert.rejects(runScheduledReports({day:'2026-12-01',now:'2026-12-01T12:30:00Z',records:{...records,meta:{success:false}},hasReport:async()=>false,generate:async()=>calls++}),/meta/);assert.equal(calls,0);});
test('only schedules missing daily, weekly and monthly reports',async()=>{const generated=[];await runScheduledReports({day:'2026-12-01',now:'2026-12-01T12:30:00Z',records,hasReport:async p=>p.kind==='weekly',generate:async p=>generated.push(p.kind)});assert.deepEqual(generated,['daily','monthly']);});
test('a failed daily report does not prevent the weekly and monthly reports',async()=>{const attempted=[];await assert.rejects(runScheduledReports({day:'2026-12-01',now:'2026-12-01T12:30:00Z',records,hasReport:async()=>false,generate:async p=>{attempted.push(p.kind);if(p.kind==='daily')throw Error('failed');}}),/daily/);assert.deepEqual(attempted,['daily','weekly','monthly']);});

test('an existing weekly report still allows a missing Reddit Lifetime report to run',async()=>{
 const attempted=[];
 const generated=await runScheduledReports({day:'2026-12-01',now:'2026-12-01T12:30:00Z',records,hasReport:async()=>true,generate:async()=>assert.fail('period already exists'),redditLifetime:{
  snapshot:records.reddit,hasReport:async()=>false,generate:async period=>attempted.push(period.kind),
 }});
 assert.deepEqual(attempted,['weekly']);
 assert.deepEqual(generated.map(period=>period.coverage),['reddit-lifetime']);
});

test('a missing Reddit Lifetime snapshot does not stop the normal weekly report',async()=>{
 const attempted=[];
 await assert.rejects(runScheduledReports({day:'2026-12-01',now:'2026-12-01T12:30:00Z',records,hasReport:async p=>p.kind!=='weekly',generate:async p=>attempted.push(p.kind),redditLifetime:{
  hasReport:async()=>false,generate:async()=>assert.fail('requires the latest lifetime snapshot'),
 }}),/Waiting for the updated Reddit Lifetime snapshot/);
 assert.deepEqual(attempted,['weekly']);
});

test('a missing Social Lifetime report runs after the weekly report even if Reddit Lifetime fails',async()=>{
 const attempted=[];
 await assert.rejects(runScheduledReports({
  day:'2026-12-01',now:'2026-12-01T12:30:00Z',records,
  hasReport:async period=>period.kind!=='weekly',
  generate:async()=>attempted.push('weekly'),
  redditLifetime:{snapshot:records.reddit,hasReport:async()=>false,generate:async()=>{throw Error('Reddit error');}},
  socialLifetime:{snapshot:records['social-media'],hasReport:async()=>false,generate:async()=>attempted.push('social-lifetime')},
 }),/reddit-lifetime: Reddit error/);
 assert.deepEqual(attempted,['weekly','social-lifetime']);
});
