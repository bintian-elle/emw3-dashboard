import test from 'node:test';import assert from 'node:assert/strict';
import {runScheduledReports} from './scheduled-reports.mjs';
import {REPORT_CHANNELS} from './report-readiness.mjs';
const records=Object.fromEntries(REPORT_CHANNELS.map(c=>[c,{success:true,updatedAt:'2026-12-01T11:30:00Z'}]));
test('does not generate any reports if one source is not current',async()=>{let calls=0;await assert.rejects(runScheduledReports({day:'2026-12-01',now:'2026-12-01T12:30:00Z',records:{...records,meta:{success:false}},hasReport:async()=>false,generate:async()=>calls++}),/meta/);assert.equal(calls,0);});
test('only schedules missing daily, weekly and monthly reports',async()=>{const generated=[];await runScheduledReports({day:'2026-12-01',now:'2026-12-01T12:30:00Z',records,hasReport:async p=>p.kind==='weekly',generate:async p=>generated.push(p.kind)});assert.deepEqual(generated,['daily','monthly']);});
test('a failed daily report does not prevent the weekly and monthly reports',async()=>{const attempted=[];await assert.rejects(runScheduledReports({day:'2026-12-01',now:'2026-12-01T12:30:00Z',records,hasReport:async()=>false,generate:async p=>{attempted.push(p.kind);if(p.kind==='daily')throw Error('failed');}}),/daily/);assert.deepEqual(attempted,['daily','weekly','monthly']);});
