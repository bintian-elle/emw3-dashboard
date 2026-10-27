import {test} from 'node:test';
import assert from 'node:assert/strict';
import {querySnapshot,validateReport,materializeReport,resolveRequestedRange,canReadJob,validDashboardOrigin} from './ai-dashboard.ts';
const range={start:'2026-09-01',end:'2026-09-30'};
const widget={id:'spend',title:'Spend',kind:'metric',source:'google_ads',groupBy:'overview',metrics:['spend']};
const spec={title:'September overview',summary:'Snapshot report',range,widgets:[widget]};
test('calendar last month and last 30 days remain distinct',()=>{
 assert.deepEqual(resolveRequestedRange('Show overview for last month','2026-10-26'),range);
 assert.deepEqual(resolveRequestedRange('Show overview for last 30 days','2026-10-26'),{start:'2026-09-26',end:'2026-10-25'});
});
test('refuses unsupported dates, sources and fields',async()=>{
 await assert.rejects(()=>querySnapshot({source:'google_ads',groupBy:'day',start:'2023-09-26',end:'2023-10-25'}),/days/i);
 await assert.rejects(()=>querySnapshot({source:'meta',groupBy:'day',...range}),/source/i);
 await assert.rejects(()=>querySnapshot({source:'google_ads',groupBy:'day',start:'2026-09-31',end:'2026-09-31'}),/date/i);
 assert.throws(()=>validateReport({...spec,widgets:[{...widget,metrics:['password']}]}),/metric/i);
 assert.throws(()=>validateReport({...spec,widgets:[{...widget,html:'<script>'}]}),/field/i);
 assert.throws(()=>validateReport({...spec,widgets:[{...widget,kind:'scatter'}]}),/kind/i);
});
test('snapshot reader returns all thirty days and ratios from sums',async()=>{
 const result=await querySnapshot({source:'google_ads',groupBy:'day',...range});
 assert.equal(result.rows.length,30);
 const overview=await querySnapshot({source:'google_ads',groupBy:'overview',...range});
 const row=overview.rows[0];
 assert.equal(row.spend,result.rows.reduce((sum,r)=>sum+Number(r.spend),0));
 assert.equal(row.roas,Number(row.revenue)/Number(row.spend));
 assert.ok(Number(row.spend)>0);
 assert.equal(result.currency,'USD');
});
test('EDM distinguishes campaign/flow attribution and has no paid spend',async()=>{
 const result=await querySnapshot({source:'edm',groupBy:'channel',...range});
 assert.ok(result.rows.some(r=>r.label==='Email'));
 assert.ok(result.rows.every(r=>!('spend' in r)&&!('roas' in r)));
 assert.throws(()=>validateReport({...spec,widgets:[{...widget,source:'edm'}]}),/metric/i);
});
test('requires tool provenance and rejects fabricated model numbers',async()=>{
 await assert.rejects(()=>materializeReport(spec,[]),/query/i);
 const report=await materializeReport(spec,[{source:'google_ads',groupBy:'overview',...range}]);
 assert.ok(Number(report.widgets[0].rows[0].spend)>0);
 assert.throws(()=>validateReport({...spec,widgets:[{...widget,value:999999}]}),/field/i);
});
test('job ownership is checked even for a known UUID',()=>{
 assert.equal(canReadJob({owner:'alice'},'alice'),true);
 assert.equal(canReadJob({owner:'alice'},'bob'),false);
});

test("same-origin compares the actual host header, not Next canonical localhost",()=>{
 assert.equal(validDashboardOrigin("http://127.0.0.1:3100","127.0.0.1:3100"),true);
 assert.equal(validDashboardOrigin("http://evil.example","127.0.0.1:3100"),false);
 assert.equal(validDashboardOrigin(null,"127.0.0.1:3100"),false);
});
test('chart validation refuses mixed units and supports ranking by ROAS',async()=>{
 assert.throws(()=>validateReport({...spec,widgets:[{...widget,kind:'line',groupBy:'day',metrics:['spend','clicks']}]}),/units/i);
 const ranked={...spec,widgets:[{...widget,kind:'table',groupBy:'campaign',metrics:['revenue','roas'],sortBy:'roas'}]};
 const report=await materializeReport(ranked,[{source:'google_ads',groupBy:'campaign',...range}]);
 assert.ok(report.widgets[0].rows.every((r,i,rows)=>i===0||Number(rows[i-1].roas)>=Number(r.roas)));
});
test('explicit September subranges take precedence over month names',()=>{
 assert.deepEqual(resolveRequestedRange('Show September performance from 2026-09-01 to 2026-09-15'),{start:'2026-09-01',end:'2026-09-15'});
 assert.deepEqual(resolveRequestedRange('Show September 1–15'),{start:'2026-09-01',end:'2026-09-15'});
 assert.deepEqual(resolveRequestedRange('查看9月1日至15日'),{start:'2026-09-01',end:'2026-09-15'});
 assert.deepEqual(validateReport({...spec,range:resolveRequestedRange('September 2025')}).range,{start:'2025-09-01',end:'2025-09-30'});
});

test('production dashboard mutations require an exact HTTPS origin',()=>{
 assert.equal(validDashboardOrigin('https://agents.emw3-dashboard.win','agents.emw3-dashboard.win'),true);
 assert.equal(validDashboardOrigin('https://emw3-dashboard.win','emw3-dashboard.win'),true);
 assert.equal(validDashboardOrigin('https://evil.example','agents.emw3-dashboard.win'),false);
 assert.equal(validDashboardOrigin('http://agents.emw3-dashboard.win','agents.emw3-dashboard.win'),false);
 assert.equal(validDashboardOrigin('https://user@agents.emw3-dashboard.win','agents.emw3-dashboard.win'),false);
});
