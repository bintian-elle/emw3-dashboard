import 'server-only';
import {promptRunRouting} from './testing-prompt-run-policy';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {readIntegratedReports,integratedReportDirectory} from './testing-integrated-reports.server';
import {readTestingPageReadouts} from './testing-readout-page-cache';
import {localStagingReadoutDirectory,readStagingReadoutSnapshot} from './staging-readout-snapshots';
import type {OverviewInsightSource} from './testing-overview-trial-sources';
import type {PromptRun} from './testing-prompts-contract';
export function overviewTrialSources(rows:Array<PromptRun&{frozen_input:{comparison?:{start:string;end:string};visual_context?:{scope?:string}}}>):OverviewInsightSource[]{
 return rows.flatMap(row=>{if(!promptRunRouting(row.period.channel??'google-search',row.frozen_input,false).visibleTrial||row.status!=='completed'||!row.result||row.campaign!=='all'||row.mode!=='analysis')return [];const content=row.result.reports?.en??row.result.report??row.result;return [{channel:row.period.channel??'google-search',kind:'trial' as const,id:row.id,created_at:String(row.updated_at),period:row.period,comparison:row.frozen_input.comparison,scope:row.frozen_input.visual_context?.scope,content}];});
}
export async function savedOverviewSources(period:{start:string;end:string}):Promise<OverviewInsightSource[]>{
 const bundle=await readIntegratedReports(),root=await integratedReportDirectory();let turns:Record<string,{completed_at?:number}>={};if(root)try{turns=JSON.parse(await readFile(path.join(root,'state.json'),'utf8')).turns??{};}catch{/* Older saved bundles may not record generation times. */}const sources:OverviewInsightSource[]=Object.entries(bundle?.reports??{}).filter(([channel])=>!['overview','reddit-lifetime'].includes(channel)).map(([channel,value])=>({channel,kind:'saved',id:value.en.run_id,created_at:turns[channel]?.completed_at?new Date(turns[channel].completed_at!*1000).toISOString():'',priority:1,period:value.en.period,comparison:value.en.comparison,scope:value.en.scope,content:value.en}));
 const matching=sources.filter(s=>s.scope==='lifetime'||s.period.start===period.start&&s.period.end===period.end);if(matching.length===7)return sources;
 const keys=[`period:last-week-tue-mon:${period.start}:${period.end}`,`period:custom:${period.start}:${period.end}`,'period:social-lifetime'];
 const directory=localStagingReadoutDirectory(),local=directory?await readStagingReadoutSnapshot(directory,keys,'en'):null;
 const records=local??await readTestingPageReadouts(keys,'en',true);
 for(const record of records){const payload=record.payload as {channel_reports?:Array<{report_id:string;scope:string;period:{start:string;end:string}}>};for(const report of payload.channel_reports??[])if(!['overview','reddit-lifetime'].includes(report.report_id))sources.push({channel:report.report_id,kind:'saved',id:record.cache_key,created_at:new Date(record.updated_at).toISOString(),period:report.period,scope:report.scope,content:report});}
 return sources;
}
