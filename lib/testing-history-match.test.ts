import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {matchHistoryReport} from './testing-history-match.ts';
const record=(label:string,start:string,end:string)=>({period_label:label,period_start:start,period_end:end,payload:{overview:{executive_summary:'Summary'},channel_reports:[{report_id:'meta',executive_summary:'Meta summary',sections:[],campaigns:[{test_id:'Campaign A',summary:'Campaign summary',detail_markdown:'Details'}]}]}});
test('matches only the selected complete reporting period and scope',()=>{
 const rows=[record('Week-to-date','2026-10-27','2026-11-01'),record('Last Week (Tue–Mon)','2026-10-27','2026-11-02')];
 assert.equal(matchHistoryReport(rows,'weekly','2026-10-27','2026-11-02','overview')?.summary,'Summary');
 assert.equal(matchHistoryReport(rows,'weekly','2026-10-27','2026-11-02','meta')?.summary,'Meta summary');
 assert.equal(matchHistoryReport(rows,'daily','2026-10-27','2026-11-02','overview'),null);
 assert.equal(matchHistoryReport(rows,'weekly','2026-10-27','2026-11-02','edm'),null);
 assert.equal(matchHistoryReport(rows,'weekly','2026-10-27','2026-11-02','meta','Campaign A')?.summary,'Campaign summary');
 assert.equal(matchHistoryReport(rows,'weekly','2026-10-27','2026-11-02','meta','Other'),null);
});
test('matches a complete month-to-date record but not a partial month',()=>{
 const rows=[record('Month-to-date','2026-10-01','2026-10-30'),record('Month-to-date','2026-10-01','2026-10-31')];
 assert.ok(matchHistoryReport(rows,'monthly','2026-10-01','2026-10-31','overview'));
 assert.equal(matchHistoryReport(rows,'monthly','2026-10-01','2026-10-30','overview'),null);
 assert.equal(matchHistoryReport([record('Month-to-date','2026-11-01','2026-11-01')],'daily','2026-11-01','2026-11-01','overview'),null);
});

test('generation time comes from the exact saved report that matched the requested scope',()=>{
 const rows=[{...record('Last Week (Tue–Mon)','2026-10-27','2026-11-02'),generated_at:'2026-11-03T10:44:03.761Z',payload:{overview:{executive_summary:'Overview only'}}},{...record('Last Week (Tue–Mon)','2026-10-27','2026-11-02'),generated_at:new Date('2026-11-04T09:30:00.000Z')}];
 assert.equal(matchHistoryReport(rows,'weekly','2026-10-27','2026-11-02','overview')?.generatedAt,'2026-11-03T10:44:03.761Z');
 assert.equal(matchHistoryReport(rows,'weekly','2026-10-27','2026-11-02','meta')?.generatedAt,'2026-11-04T09:30:00.000Z');
 assert.equal(matchHistoryReport([{...rows[0],generated_at:'invalid'}],'weekly','2026-10-27','2026-11-02','overview')?.generatedAt,null);
});
