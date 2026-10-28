import test from 'node:test';
import assert from 'node:assert/strict';
import {decodePromptPreviewReport,previewReadoutRecords,previewReportForPath} from './testing-prompt-preview.ts';
const manifest={run_id:'20261028-zh',language:'zh-CN',status:'running',period:{label:'Last Week (Tue–Mon)',start:'2026-10-20',end:'2026-10-26'}};
const report={schema_version:'channel-prompt-preview-v1',run_id:'20261028-zh',report_id:'meta',language:'zh-CN',title:'Meta 创意诊断',executive_summary:'图片与视频需要按购买证据分别判断。',sections:[{title:'创意与格式深度诊断',markdown:'| 广告 | ROAS |\n| --- | --- |\n| Video4 | 2.04 |'}],campaigns:[{test_id:'campaign-a',summary:'保留 Video4 继续验证。',detail_markdown:'### 下一步\n比较两种诉求。'}],data_gaps:[],sources:[],scope:'period',period:manifest.period};
test('channel-specific Markdown headings survive without uniformizing the report',()=>{assert.deepEqual(decodePromptPreviewReport(report,'20261028-zh','meta')?.sections,report.sections);assert.equal(decodePromptPreviewReport({...report,run_id:'other'},'20261028-zh','meta'),null);assert.equal(decodePromptPreviewReport({...report,sections:[{title:'x',markdown:42}]},'20261028-zh','meta'),null);});
test('preview replaces only its exact selected period and preserves campaign identity',()=>{const records=previewReadoutRecords(manifest,[report],['period:last-week-tue-mon:2026-10-20:2026-10-26','period:week-to-date:2026-10-27:2026-10-28']);assert.equal(records.length,1);assert.equal(records[0].payload.tests[0].test_id,'campaign-a');assert.equal(records[0].payload.tests[0].summary,report.campaigns[0].summary);assert.equal(records[0].payload._local_prompt_preview,true);});
test('Reddit lifetime and weekly reports never overwrite each other',()=>{const lifetime={...report,report_id:'reddit-lifetime',scope:'lifetime',period:{label:'Lifetime (Sep 24, 2026 – Now)',start:'2026-09-24',end:'2026-10-28'},campaigns:[{test_id:'r',summary:'全周期',detail_markdown:'全周期明细'}]};const weekly={...report,report_id:'reddit',campaigns:[{test_id:'r',summary:'本周',detail_markdown:'本周明细'}]};const rows=previewReadoutRecords(manifest,[weekly,lifetime],['period:reddit-lifetime','period:last-week-tue-mon:2026-10-20:2026-10-26']);assert.equal(rows[0].payload.tests[0].summary,'全周期');assert.equal(rows[0].payload.period.start,'2026-09-24');assert.equal(rows[1].payload.tests[0].summary,'本周');});
test('empty in-progress preview still suppresses old shared results for its period',()=>{const rows=previewReadoutRecords(manifest,[],['period:last-week-tue-mon:2026-10-20:2026-10-26']);assert.equal(rows[0].payload._local_prompt_preview,true);assert.deepEqual(rows[0].payload.tests,[]);});
test('only root channel pages mount full reports; detail and concluded pages remain scoped',()=>{assert.equal(previewReportForPath('/bluevua/testing/google/search'),'google-search');assert.equal(previewReportForPath('/bluevua/testing/google/pmax/123'),null);assert.equal(previewReportForPath('/bluevua/testing/social'),'social-media');assert.equal(previewReportForPath('/bluevua/testing/concluded/google-search'),null);});

test('campaign readers keep polling until the local generation finishes',()=>{const key='period:last-week-tue-mon:2026-10-20:2026-10-26';assert.equal(previewReadoutRecords(manifest,[],[key])[0].payload._preview_pending,true);assert.equal(previewReadoutRecords({...manifest,status:'completed'},[report],[key])[0].payload._preview_pending,false);});

test('English local translation retains campaign routing and period without changing Chinese support',()=>{
 const english={...report,language:'en',title:'Meta creative review',executive_summary:'Retain the video for validation.'};
 assert.equal(decodePromptPreviewReport(english,manifest.run_id,'meta')?.language,'en');
 assert.equal(decodePromptPreviewReport(report,manifest.run_id,'meta')?.language,'zh-CN');
 const rows=previewReadoutRecords({...manifest,language:'en'},[english],['period:last-week-tue-mon:2026-10-20:2026-10-26']);
 assert.equal(rows[0].payload.tests[0].test_id,'campaign-a');
 assert.equal(decodePromptPreviewReport({...english,language:'fr'},manifest.run_id,'meta'),null);
});

test('published reports retain channel and Campaign analysis without development flags',async()=>{
 const {channelReportRecords}=await import('./testing-prompt-preview.ts');
 const english={...report,language:'en'} as Parameters<typeof channelReportRecords>[1][number];
 const rows=channelReportRecords({...manifest,status:'completed'},[english]);
 assert.equal(rows.length,1);
 assert.equal(rows[0].payload.channel_reports[0].report_id,'meta');
 assert.equal(rows[0].payload.tests[0].test_id,'campaign-a');
 assert.equal('_local_prompt_preview' in rows[0].payload,false);
 const wtd=channelReportRecords({...manifest,period:{...manifest.period,label:'Week-to-date'}},[english]);
 assert.equal(wtd[0].cache_key,'period:week-to-date:2026-10-20:2026-10-26');
});
