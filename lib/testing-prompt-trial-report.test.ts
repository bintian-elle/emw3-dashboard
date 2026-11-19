import {test} from 'node:test';import assert from 'node:assert/strict';
import {assembleTrialVisualResult,assembleSingleTrialVisualResult,validateTrialVisualResult,trialMetricRows,type TrialPresentationContext} from './testing-prompt-trial-report.ts';
import type {InsightPresentation} from './testing-insight-presentation.ts';
const context:TrialPresentationContext={run_id:'source',period:{start:'2026-10-27',end:'2026-11-02'},comparison:{start:'2026-10-20',end:'2026-10-26'},totals:{spend:5},sections:[{id:'macro',title:'Performance'}],datasets:{input:{id:'input',scopes:['channel','Campaign A'],xKey:'category',columns:{category:'category'},rows:[]}},media:[],source_urls:[]};
const presentation:InsightPresentation={schema_version:'insight-presentation-v3',title:'Evidence',summary:'Decision',sections:context.sections,blocks:['channel','Campaign A'].map(scope=>({id:scope,scope,section_id:'macro',type:'document',title:'Finding',html:'<div>Finding</div>',dataset_refs:['input'],media_keys:[],design_reason:'Verified frozen input',text:'',chart:null,creative:null,actions:[],charts:[]}))};
const raw={en:{presentation,campaigns:[{test_id:'Campaign A',summary:'Summary',detail_markdown:'Audit'}]},zh:{presentation,campaigns:[{test_id:'Campaign A',summary:'总结',detail_markdown:'依据'}]}};
test('trials use the normal visual report contract and frozen evidence for both languages',()=>{const result=assembleTrialVisualResult(raw,context,'zh','trial-1');assert.equal(result.report.language,'zh');assert.equal(result.reports.en.run_id,'trial-1');assert.equal(result.reports.zh.totals.spend,5);assert.doesNotThrow(()=>validateTrialVisualResult(result,['Campaign A'],context));assert.throws(()=>validateTrialVisualResult(result,['Other campaign'],context));const altered=structuredClone(result);altered.reports.en.period.start='2026-10-01';assert.throws(()=>validateTrialVisualResult(altered,['Campaign A'],context));});
test('normal renderer validation rejects invented chart or media in trials too',()=>{const bad=structuredClone(raw);bad.en.presentation.blocks[0].html='<img src="https://unverified.example/image.png"/>';assert.throws(()=>assembleTrialVisualResult(bad,context,'en','trial-1'));});
test('fallback datasets retain individual measurements without summing associations',()=>{assert.deepEqual(trialMetricRows([{name:'Creative A',metrics:{spend:1,revenue:2}},{name:'Creative B',metrics:{spend:1,revenue:2}}]),[{category:'Creative A',spend:1,revenue:2},{category:'Creative B',spend:1,revenue:2}]);});

test('temporary output requires only the selected language',()=>{const report=assembleSingleTrialVisualResult({zh:raw.zh},context,'zh','trial-one');assert.equal(report.language,'zh');assert.equal(report.run_id,'trial-one');assert.throws(()=>assembleSingleTrialVisualResult({en:raw.en},context,'zh','trial-one'));});

test('supplemental evidence is persisted with both languages and can be cited by the presentation',()=>{
 const data={id:'ai.meta.spend',scope:'channel',columns:[{key:'spend',unit:'USD'}],rows:[{category:'Current',period:{start:'2026-10-27',end:'2026-11-02'},entities:['Campaign A'],source:{channel:'meta',reference:'https://graph.facebook.com/insights',request:'campaign insights',retrieved_at:'2026-11-18T12:00:00Z'},values:[{key:'spend',value:42}]}]};
 const policy={periods:[context.period,context.comparison],entities:[{channel:'meta',id:'Campaign A',start:'2026-10-20'}],scopes:['channel','Campaign A']};
 const enriched=structuredClone(raw);
 for(const lang of ['en','zh'] as const){const block=enriched[lang].presentation.blocks[0];block.html='<div data-insight-chart="supplement-chart"></div>';block.dataset_refs=[data.id];block.charts=[{id:'supplement-chart',spec:{chart_type:'column',dataset_ref:data.id,x_key:'category',y_keys:['spend'],reason:'Compare spend',annotations:[]}}];}
 const result=assembleTrialVisualResult({...enriched,supplemental_datasets:[data]},context,'zh','trial',policy);
 for(const lang of ['en','zh'] as const){const dataset=result.reports[lang].datasets[data.id];assert.equal(dataset.rows[0].spend,42);assert.equal(dataset.provenance?.rows[0].source.request,'campaign insights');assert.equal(dataset.provenance?.verification,'scope-checked-source-unverified');}
 assert.equal(context.datasets[data.id],undefined);
 const single=assembleSingleTrialVisualResult({zh:raw.zh,supplemental_datasets:[data]},context,'zh','trial',policy);assert.equal(single.datasets[data.id].rows[0].spend,42);
 assert.throws(()=>assembleTrialVisualResult({...raw,supplemental_datasets:[data]},context,'en','trial'));
});
