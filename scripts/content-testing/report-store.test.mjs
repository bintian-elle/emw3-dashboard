import test from 'node:test';
import assert from 'node:assert/strict';
import {storeReportBundle} from './report-store.mjs';
function fixture(){return {run:{id:'run-1',kind:'weekly',start:'2026-10-27',end:'2026-11-02',compareStart:'2026-10-20',compareEnd:'2026-10-26'},reports:[{channel:'meta',scope:'period',report:{en:{title:'English'},zh:{title:'中文'}}}],media:[]};}
test('writes a complete bilingual run atomically and never deletes old reports',async()=>{const calls=[];await storeReportBundle({query:async(...args)=>calls.push(args)},fixture());assert.equal(calls[0][0],'BEGIN');assert.equal(calls.at(-1)[0],'COMMIT');assert.ok(calls.some(([sql])=>sql.includes('content_testing_reports.reports')));assert.ok(calls.every(([sql])=>!/^\s*(delete|truncate)/i.test(sql)));});
test('rejects partial bilingual output before opening a transaction',async()=>{let calls=0;const b=fixture();delete b.reports[0].report.zh;await assert.rejects(storeReportBundle({query:async()=>calls++},b));assert.equal(calls,0);});
test('rolls back on write failure',async()=>{const calls=[];const c={query:async(sql)=>{calls.push(sql);if(sql.includes('INSERT INTO content_testing_reports.reports'))throw Error('failed')}};await assert.rejects(storeReportBundle(c,fixture()));assert.equal(calls.at(-1),'ROLLBACK');});
