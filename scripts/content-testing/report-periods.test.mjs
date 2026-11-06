import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduledReports} from './report-periods.mjs';

test('daily, Tuesday weekly and first of month include full previous periods',()=>{
 assert.deepEqual(scheduledReports('2026-12-01'),[
  {kind:'daily',start:'2026-11-30',end:'2026-11-30',compareStart:'2026-11-29',compareEnd:'2026-11-29'},
  {kind:'weekly',start:'2026-11-24',end:'2026-11-30',compareStart:'2026-11-17',compareEnd:'2026-11-23'},
  {kind:'monthly',start:'2026-11-01',end:'2026-11-30',compareStart:'2026-10-01',compareEnd:'2026-10-31'}]);
});
test('handles leap days and year boundaries without WTD or MTD',()=>{
 assert.deepEqual(scheduledReports('2024-03-01').map(x=>x.kind),['daily','monthly']);
 assert.deepEqual(scheduledReports('2024-03-01')[1],{kind:'monthly',start:'2024-02-01',end:'2024-02-29',compareStart:'2024-01-01',compareEnd:'2024-01-31'});
 assert.deepEqual(scheduledReports('2026-01-01')[1],{kind:'monthly',start:'2025-12-01',end:'2025-12-31',compareStart:'2025-11-01',compareEnd:'2025-11-30'});
});
test('rejects invalid calendar dates',()=>{assert.throws(()=>scheduledReports('2026-02-30'));});
