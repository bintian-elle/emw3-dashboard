import {testingReadoutKey} from "./testing-readout-contract.ts";
import {conclusionOnlySections,conclusionOnlyMarkdown} from "./testing-prompt-presentation.ts";
export type PromptPreviewReport={schema_version:'channel-prompt-preview-v1';run_id:string;report_id:string;language:'zh-CN'|'en';title:string;executive_summary:string;sections:Array<{title:string;markdown:string}>;campaigns:Array<{test_id:string;summary:string;detail_markdown:string}>;data_gaps:string[];sources:string[];scope:'period'|'lifetime';period:{label:string;start:string;end:string}};
export type PromptPreviewManifest={run_id:string;language:string;status:string;period:{label:string;start:string;end:string};reports?:Array<{report_id:string;period:{label:string;start:string;end:string}}>};
const object=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const strings=(value:unknown):value is string[]=>Array.isArray(value)&&value.every(item=>typeof item==='string');
export function decodePromptPreviewReport(value:unknown,runId:string,reportId:string):PromptPreviewReport|null{
 if(!object(value)||value.schema_version!=='channel-prompt-preview-v1'||value.run_id!==runId||value.report_id!==reportId||!['zh-CN','en'].includes(String(value.language))||!['period','lifetime'].includes(String(value.scope)))return null;
 if(!object(value.period)||!['label','start','end'].every(key=>typeof (value.period as Record<string,unknown>)[key]==='string'))return null;
 if(!['title','executive_summary'].every(key=>typeof value[key]==='string'&&Boolean((value[key] as string).trim())))return null;
 if(!Array.isArray(value.sections)||!value.sections.length||!value.sections.every(item=>object(item)&&typeof item.title==='string'&&typeof item.markdown==='string'))return null;
 if(!Array.isArray(value.campaigns)||!value.campaigns.every(item=>object(item)&&['test_id','summary','detail_markdown'].every(key=>typeof item[key]==='string')))return null;
 if(!strings(value.data_gaps)||!strings(value.sources))return null;
 return {...value,sections:conclusionOnlySections(value.sections as PromptPreviewReport["sections"]),campaigns:(value.campaigns as PromptPreviewReport["campaigns"]).map(campaign=>({...campaign,detail_markdown:conclusionOnlyMarkdown(campaign.detail_markdown)}))} as PromptPreviewReport;
}
const channelNames:Record<string,string>={'google-search':'Google Search','google-pmax':'Google PMAX','google-demand-gen':'Demand Gen',meta:'Meta',reddit:'Reddit','reddit-lifetime':'Reddit',edm:'EDM','social-media':'Social Media'};
export function previewReadoutRecords(manifest:PromptPreviewManifest,rawReports:readonly unknown[],keys:string[]){
 const reports=rawReports.flatMap(raw=>{const id=object(raw)?String(raw.report_id):'';const report=decodePromptPreviewReport(raw,manifest.run_id,id);return report?[report]:[];});
 const weekly=`period:last-week-tue-mon:${manifest.period.start}:${manifest.period.end}`;
 return keys.flatMap(key=>{
  if(![weekly,'period:reddit-lifetime','period:social-lifetime'].includes(key))return [];
  const chosen=reports.filter(report=>key===weekly?report.scope==='period':report.report_id===(key==='period:reddit-lifetime'?'reddit-lifetime':'social-media'));
  const overview=chosen.find(report=>report.report_id==='overview');
  const lifetimeId=key==='period:reddit-lifetime'?'reddit-lifetime':'social-media';
  const resultPeriod=key===weekly?manifest.period:chosen[0]?.period??manifest.reports?.find(report=>report.report_id===lifetimeId)?.period??{label:key==='period:reddit-lifetime'?'Lifetime (Sep 24, 2026 – Now)':'Lifetime snapshot',start:'',end:''};
  const tests=chosen.flatMap(report=>report.campaigns.map(campaign=>({test_id:campaign.test_id,campaign_name:campaign.test_id,channel:channelNames[report.report_id],summary:campaign.summary,preview_sections:[{title:'',markdown:campaign.detail_markdown}]})));
  return [{cache_key:key,payload:{schema_version:'1.0',run_mode:'period_readout',period:resultPeriod,metric_basis:{pmax:'pmax-testing-assets-v1'},_local_prompt_preview:true,_preview_pending:manifest.status!=='completed',tests,...(overview?{overview:{executive_summary:overview.executive_summary,key_findings:[],recommended_actions:[],data_gaps:overview.data_gaps},preview_overview_sections:overview.sections}:{})}}];
 });
}
export function previewReportForPath(pathname:string):string|null{
 const paths:Record<string,string>={'/bluevua/testing':'overview','/bluevua/testing/google':'google-search','/bluevua/testing/google/search':'google-search','/bluevua/testing/google/pmax':'google-pmax','/bluevua/testing/google/demand-gen':'google-demand-gen','/bluevua/testing/meta':'meta','/bluevua/testing/reddit':'reddit','/bluevua/testing/edm':'edm','/bluevua/testing/social':'social-media'};
 return paths[pathname.replace(/\/$/,'')]??null;
}

/** Stable database format shared by scheduled runs and one-off approved imports. */
export function channelReportRecords(manifest:PromptPreviewManifest,reports:PromptPreviewReport[]){
 const keys=[`period:last-week-tue-mon:${manifest.period.start}:${manifest.period.end}`,'period:reddit-lifetime','period:social-lifetime'];
 return previewReadoutRecords(manifest,reports,keys).filter(record=>record.payload.tests.length||record.payload.overview).map(record=>{
  const { _local_prompt_preview: _local, _preview_pending: _pending, ...payload }=record.payload;
  void _local;void _pending;
  const selected=reports.filter(report=>record.cache_key==='period:reddit-lifetime'?report.report_id==='reddit-lifetime':record.cache_key==='period:social-lifetime'?report.report_id==='social-media':report.scope==='period');
  return {...record,cache_key:record.cache_key.startsWith('period:last-week-tue-mon:')?testingReadoutKey(manifest.period)!:record.cache_key,payload:{...payload,channel_reports:selected}};
 });
}
