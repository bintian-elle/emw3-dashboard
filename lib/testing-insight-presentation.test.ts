import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateInsightPresentation,insightPresentationGroups,presentationDocumentHtml,presentationPop,type InsightPresentation} from './testing-insight-presentation.ts';
test('independently generated scopes keep their own styles',()=>{
 const presentation={schema_version:'insight-presentation-v3',title:'Test',summary:'Test',styles_per_scope:true,blocks:[{id:'a',scope:'A',type:'document',html:'<style>.card{color:red}</style><div>A</div>'},{id:'b',scope:'B',type:'document',html:'<style>.card{color:blue}</style><div>B</div>'}]} as unknown as InsightPresentation;
 const html=presentationDocumentHtml(presentation,presentation.blocks[0]);assert.match(html,/color:red/);assert.doesNotMatch(html,/color:blue/);
});
import {insightSourceUrls} from './testing-insight-sources.ts';
const source={datasets:{'channel.daily':{id:'channel.daily',xKey:'date',columns:{date:'category',revenue:'USD',orders:'orders'},rows:[{date:'2026-10-27',revenue:12,orders:1}]}},media:[{key:'frame',asset_id:'asset-1',name:'Original video',kind:'frame' as const,timestamp_seconds:2,width:1920,height:1080,file:'frame.webp',sha256:'digest',campaigns:['Campaign A']}],analysis:{executive_summary:'One purchase',campaigns:[{test_id:'Campaign A',summary:'Validate',detail_markdown:'Evidence'}]}};
function report():InsightPresentation{return {schema_version:'insight-presentation-v1',title:'Validate repeatability',summary:'Only one order',blocks:[{id:'trend',scope:'channel',type:'chart',title:'Revenue by day',text:'One day',chart:{chart_type:'column',dataset_ref:'channel.daily',x_key:'date',y_keys:['revenue'],reason:'Daily concentration',annotations:[]},creative:null,actions:[]}]};}
test('AI chooses chart types while data stays bound to registered sources',()=>{for(const type of ['line','column','area','bar']){const value=report();value.blocks[0].chart!.chart_type=type;assert.equal(validateInsightPresentation(value,source),value);}});
test('rejects invented data, units and annotation dates',()=>{for(const mutate of [(v:InsightPresentation)=>{v.blocks[0].chart!.dataset_ref='invented';},(v:InsightPresentation)=>{v.blocks[0].chart!.y_keys=['revenue','orders'];},(v:InsightPresentation)=>{v.blocks[0].chart!.annotations=[{category:'2025-01-01',label:'fake'}];}]){const v=report();mutate(v);assert.throws(()=>validateInsightPresentation(v,source));}});
test('creative annotations require the original frame, matching asset and in-frame coordinates',()=>{const v=report();v.blocks=[{id:'creative',scope:'Campaign A',type:'creative',title:'CTA',text:'Visible contrast',chart:null,actions:[],creative:{asset_id:'asset-1',media_key:'frame',markers:[{x:.1,y:.2,width:.3,height:.2,label:'CTA',observation:'Small type',recommendation:'Test larger copy',confidence:'medium'}]}}];assert.equal(validateInsightPresentation(v,source),v);v.blocks[0].creative!.markers[0].width=1;assert.throws(()=>validateInsightPresentation(v,source));v.blocks[0].creative!.markers[0].width=.3;v.blocks[0].creative!.asset_id='wrong';assert.throws(()=>validateInsightPresentation(v,source));});
test('rejects cross-campaign routing and duplicate block identities',()=>{const v=report();v.blocks[0].scope='Campaign B';assert.throws(()=>validateInsightPresentation(v,source));v.blocks[0].scope='channel';v.blocks.push({...v.blocks[0]});assert.throws(()=>validateInsightPresentation(v,source));});

const sections=[{id:'macro',title:'宏观表现'},{id:'creative',title:'素材横向对比'},{id:'next',title:'下一步建议'}];
function structuredReport():InsightPresentation{return {schema_version:'insight-presentation-v2',title:'PMax分析',summary:'总结',sections:sections.map(s=>({...s})),blocks:['channel','Campaign A'].flatMap(scope=>sections.map(section=>({id:`${scope}-${section.id}`,scope,section_id:section.id,type:'text' as const,title:'对象与指标',text:'已完成分析的依据',chart:null,creative:null,actions:[]}))) };}
test('retains authoritative per-channel chapter titles, order and coverage for every scope',()=>{const value=structuredReport();assert.equal(validateInsightPresentation(value,{...source,sections}),value);assert.deepEqual(insightPresentationGroups(value,'channel').map(g=>g.title),sections.map(s=>s.title));for(const mutate of [(v:InsightPresentation)=>{v.sections![0].title='';},(v:InsightPresentation)=>{v.sections!.reverse();},(v:InsightPresentation)=>{v.blocks.pop();},(v:InsightPresentation)=>{[v.blocks[0],v.blocks[1]]=[v.blocks[1],v.blocks[0]];}]){const changed=structuredReport();mutate(changed);assert.throws(()=>validateInsightPresentation(changed,{...source,sections}));}});
test('legacy locally saved presentations remain viewable until a validated replacement exists',()=>{const value=report();assert.equal(insightPresentationGroups(value,'channel')[0].blocks[0],value.blocks[0]);assert.equal(validateInsightPresentation(value,source),value);});

test('AI may choose readable chapter and navigation wording while preserving direction identities',()=>{const value=structuredReport();value.sections![0].title='本期投放表现';assert.equal(validateInsightPresentation(value,{...source,sections}),value);});

test('free compositions preserve directions and may combine verified periods without a widget template',()=>{
 const value=structuredReport();value.schema_version='insight-presentation-v3';value.blocks=value.blocks.map(block=>({...block,type:'document' as const,html:'<style>.pair{display:grid;grid-template-columns:1fr 1fr}</style><div class="pair"><strong>发现</strong><svg viewBox="0 0 100 30" role="img" aria-label="比较"><rect width="40" height="20"/></svg></div>',dataset_refs:block.scope==='channel'?['channel.daily']:[],media_keys:[],design_reason:'Same registered evidence; freely composed side-by-side visual.'}));
 assert.equal(validateInsightPresentation(value,{...source,sections}),value);
 for(const html of ['<script>alert(1)</script>','<img src="https://unverified.example/image">','<div onclick="alert(1)">x</div>']){const bad=structuredClone(value);bad.blocks[0].html=html;assert.throws(()=>validateInsightPresentation(bad,{...source,sections}));}
 const bad=structuredClone(value);bad.blocks[0].dataset_refs=['invented'];assert.throws(()=>validateInsightPresentation(bad,{...source,sections}));
});

test('PoP distinguishes increase, decline, unchanged, zero baseline and missing data',()=>{
 assert.equal(presentationPop(57.74,48.8),'PoP ↑ +18.3%');assert.equal(presentationPop(108.2,340.5),'PoP ↓ −68.2%');assert.equal(presentationPop(1,1),'PoP 持平');assert.equal(presentationPop(1,0),'PoP 前期为 0');assert.equal(presentationPop(1,null),'PoP 不可用');
});

test('free layout chart slots require verified interactive data and matching placement',()=>{
 const value=structuredReport();value.schema_version='insight-presentation-v3';value.blocks=value.blocks.map(block=>({...block,type:'document' as const,html:'<div data-insight-chart="evidence"></div>',dataset_refs:['channel.daily'],media_keys:[],design_reason:'Source bound',charts:[{id:'evidence',spec:{chart_type:'column',dataset_ref:'channel.daily',x_key:'date',y_keys:['revenue'],reason:'Compare',annotations:[]}}]}));
 value.blocks=value.blocks.filter(b=>b.scope==='channel');const packet={...source,analysis:{...source.analysis,campaigns:[]},sections};assert.equal(validateInsightPresentation(value,packet),value);
 const wrong=structuredClone(value);wrong.blocks[0].charts![0].spec.dataset_ref='invented';assert.throws(()=>validateInsightPresentation(wrong,packet));const missing=structuredClone(value);missing.blocks[0].html='<div></div>';assert.throws(()=>validateInsightPresentation(missing,packet));
});

test('interactive chart slot IDs may contain campaign names and regex characters',()=>{
 const value=structuredReport();value.schema_version='insight-presentation-v3';
 const id='campaign/volume.(A)+1';
 value.blocks=value.blocks.filter(b=>b.scope==='channel').map(block=>({...block,type:'document' as const,html:`<div data-insight-chart="${id}"></div>`,dataset_refs:['channel.daily'],media_keys:[],design_reason:'Source bound',charts:[{id,spec:{chart_type:'column',dataset_ref:'channel.daily',x_key:'date',y_keys:['revenue'],reason:'Compare',annotations:[]}}]}));
 const packet={...source,analysis:{...source.analysis,campaigns:[]},sections};assert.equal(validateInsightPresentation(value,packet),value);
 const wrong=structuredClone(value);wrong.blocks[0].html='<div data-insight-chart="campaign/volumeX(A)+1"></div>';assert.throws(()=>validateInsightPresentation(wrong,packet));
});

test('isolated report blocks retain shared AI layout and annotation CSS',()=>{
 const value=structuredReport();value.blocks[0].type='document';value.blocks[0].html='<style>.source{position:relative}.mark{position:absolute}</style><article>First</article>';
 const later={...value.blocks[1],type:'document' as const,html:'<article><div class="source"><img/><div class="mark">1</div></div></article>'};value.blocks[1]=later;
 const html=presentationDocumentHtml(value,later);assert.ok(html.startsWith('<div><style>'));assert.ok(html.includes('.mark{position:absolute}'));assert.ok(html.includes(later.html));assert.equal((html.match(/<style>/g)||[]).length,1);
});

test('allows registered local creative links while rejecting unregistered or unsafe links',()=>{
 const allowed='/bluevua/testing/google/pmax/6760717525';
 assert.ok(insightSourceUrls({url:allowed}).has(allowed));
 const value=structuredReport();value.schema_version='insight-presentation-v3';value.blocks=value.blocks.filter(b=>b.scope==='channel').map(b=>({...b,type:'document' as const,html:`<a href="${allowed}">Creative</a>`,dataset_refs:[],media_keys:[],design_reason:'Registered source'}));
 const packet={...source,analysis:{...source.analysis,campaigns:[]},sections,source_urls:[allowed]};assert.equal(validateInsightPresentation(value,packet),value);
 for(const href of ['/bluevua/testing/google/pmax/unregistered','//evil.test/path','/\\evil.test']){const bad=structuredClone(value);bad.blocks[0].html=`<a href="${href}">Creative</a>`;assert.throws(()=>validateInsightPresentation(bad,packet));}
});

test('shares and saves are comparable counts without a forced second axis',()=>{const value=report();value.blocks[0].chart!.y_keys=['shares','saves'];const packet={...source,datasets:{'channel.daily':{id:'channel.daily',xKey:'date',columns:{date:'category',shares:'shares',saves:'saves'},rows:[{date:'2026-10-27',shares:2,saves:3}]}}};assert.equal(validateInsightPresentation(value,packet),value);});
test('a dataset explicitly verified for a Campaign can support its chart',()=>{
 const value=report();value.blocks[0].scope='Campaign A';
 const packet={...source,datasets:{'channel.daily':{...source.datasets['channel.daily'],scopes:['channel','Campaign A']}}};
 assert.equal(validateInsightPresentation(value,packet),value);
 const wrong={...packet,datasets:{'channel.daily':{...packet.datasets['channel.daily'],scopes:['channel']}}};assert.throws(()=>validateInsightPresentation(value,wrong));
});
