import 'server-only';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import type {IntegratedReportBundle} from './testing-integrated-reports';
import {Pool} from 'pg';
import {assembleStoredBundle} from './testing-report-store';
import {reportDatabaseEnvironment} from './testing-report-environment';
import {reportDatabaseConfig} from '../scripts/content-testing/report-database.mjs';
import {readComparisonPeriod} from './testing-comparison.server';
import {redditSinceStartLabel} from './reddit-testing-period';
import {validRedditTestingSnapshot} from './testing-reddit-snapshot';
let pool:Pool|undefined;
const reportEnvironment=reportDatabaseEnvironment;
function database(){
 return pool??=new Pool({...reportDatabaseConfig(),max:3,connectionTimeoutMillis:10000});
}
/** Explicit opt-in limits draft access to the local development server. */
export function localProductionReportRun(){
 const id=(process.env.NODE_ENV==='development'||process.env.LOCAL_PRODUCTION_PREVIEW==='1')?process.env.LOCAL_PRODUCTION_REPORT_RUN_ID?.trim():undefined;
 return id&&/^[a-z0-9-]{1,100}$/.test(id)?id:null;
}
export async function readStoredRun(runId:string){
 const run=await database().query<{start:string;end:string}>(`select to_char(period_start,'YYYY-MM-DD') as start,to_char(period_end,'YYYY-MM-DD') as end from content_testing_reports.runs where id=$1 and status='completed' and environment=$2`,[runId,reportEnvironment()]);
 if(!run.rows[0])return null;
 const rows=await database().query<{channel:string;report:unknown}>('select channel,report from content_testing_reports.reports where run_id=$1',[runId]);
 const bundle=assembleStoredBundle(runId,run.rows[0].start,run.rows[0].end,rows.rows);
 for(const pair of Object.values(bundle.reports))for(const report of [pair.en,pair.zh])report.media_url_base=`/api/testing/history/media/${encodeURIComponent(runId)}/`;
 return bundle;
}
export async function readStoredMedia(runId:string,key:string){
 const result=await database().query<{body:Buffer;mime_type:string}>('select m.body,m.mime_type from content_testing_reports.media m join content_testing_reports.runs r on r.id=m.run_id where r.status=$1 and m.run_id=$2 and m.media_key=$3 and r.environment=$4',['completed',runId,key,reportEnvironment()]);
 return result.rows[0]??null;
}

async function readLocalSocialReport(kind:'lifetime'|'weekly'){
 if(process.env.NODE_ENV!=='development'&&process.env.LOCAL_PRODUCTION_PREVIEW!=='1')return null;
 try{
  const file=path.join(process.cwd(),'.state/content-testing-social',kind==='weekly'?'weekly/report.json':'lifetime.json');
  const report=JSON.parse(await readFile(file,'utf8')) as IntegratedReportBundle['reports'][string];
  const scope=kind==='weekly'?'period':'lifetime';
  if(report.en?.scope!==scope||report.zh?.scope!==scope||report.en.run_id!==report.zh.run_id)return null;
  if(JSON.stringify(report.en.period)!==JSON.stringify(report.zh.period)||JSON.stringify(report.en.comparison)!==JSON.stringify(report.zh.comparison))return null;
  return report;
 }catch{return null;}
}

export async function readStoredSocialLifetime(){
 const local=await readLocalSocialReport('lifetime');
 if(local)return local;
 const result=await database().query<{id:string;report:IntegratedReportBundle['reports'][string]}>(`select r.id,p.report from content_testing_reports.runs r join content_testing_reports.reports p on p.run_id=r.id where r.status='completed' and r.environment=$1 and p.channel='social-lifetime' and p.scope='lifetime' order by r.completed_at desc,r.id desc limit 1`,[reportEnvironment()]);
 const row=result.rows[0];
 if(!row||row.report.en?.scope!=='lifetime'||row.report.zh?.scope!=='lifetime'||row.report.en.run_id!==row.id||row.report.zh.run_id!==row.id)return null;
 for(const report of [row.report.en,row.report.zh])report.media_url_base=`/api/testing/history/media/${encodeURIComponent(row.id)}/`;
 return row.report;
}
/** Keep concluded experiments separate from current campaign and history lookups. */
export async function readStoredConcludedPresentation(testId:string,period:{start:string;end:string}){
 if(!/^[a-z0-9-]+$/.test(testId))return null;
 const valid=(pair:IntegratedReportBundle['reports'][string],id:string)=>[pair.en,pair.zh].every(report=>
  report?.run_id===id&&report.scope==='lifetime'&&report.period.start===period.start&&report.period.end===period.end&&
  report.presentation.schema_version==='insight-presentation-v3'&&report.presentation.sections?.length===3&&
  report.presentation.sections.every(section=>report.presentation.blocks.some(block=>block.scope==='channel'&&block.section_id===section.id)));
 if(process.env.NODE_ENV==='development'||process.env.LOCAL_PRODUCTION_PREVIEW==='1'){
  try{
   const file=path.join(process.cwd(),'.state/content-testing-concluded',`visual-${testId}`,'report.json');
   const pair=JSON.parse(await readFile(file,'utf8')) as IntegratedReportBundle['reports'][string];
   if(pair.en?.run_id&&valid(pair,pair.en.run_id))return pair;
  }catch{/* An unpublished preview is optional. */}
 }
 const {rows:[row]}=await database().query<{id:string;report:IntegratedReportBundle['reports'][string]}>(`select r.id,p.report
 from content_testing_reports.runs r join content_testing_reports.reports p on p.run_id=r.id
 where r.status='completed' and r.environment=$1 and p.channel=$2 and p.scope='lifetime'
 and r.period_start=$3 and r.period_end=$4 order by r.completed_at desc,r.id desc limit 1`,[reportEnvironment(),`concluded:${testId}`,period.start,period.end]);
 if(!row||!valid(row.report,row.id))return null;
 for(const report of [row.report.en,row.report.zh])report.media_url_base=`/api/testing/history/media/${encodeURIComponent(row.id)}/`;
 return row.report;
}

export async function readStoredRedditLifetime(){
 const result=await database().query<{id:string;start:string;end:string;report:{dashboard_snapshot?:unknown}}>(`select r.id,to_char(r.period_start,'YYYY-MM-DD') as start,to_char(r.period_end,'YYYY-MM-DD') as end,p.report from content_testing_reports.runs r join content_testing_reports.reports p on p.run_id=r.id where r.status='completed' and r.environment=$1 and p.channel='reddit-lifetime' and p.scope='lifetime' order by r.completed_at desc,r.id desc limit 1`,[reportEnvironment()]);
 const row=result.rows[0];if(!row)return null;
 const pair=assembleStoredBundle(row.id,row.start,row.end,[{channel:'reddit-lifetime',report:row.report}]).reports['reddit-lifetime'];
 const period=pair.en.period;
 if(pair.en.scope!=='lifetime'||pair.zh.scope!=='lifetime'||pair.zh.period.start!==period.start||pair.zh.period.end!==period.end)return null;
 for(const report of [pair.en,pair.zh])report.media_url_base=`/api/testing/history/media/${encodeURIComponent(row.id)}/`;
 const data=row.report.dashboard_snapshot??await readComparisonPeriod('reddit',period);
 const snapshot=data&&typeof data==='object'?{...data,periodLabel:redditSinceStartLabel}:null;
 return {reports:pair,snapshot:validRedditTestingSnapshot(snapshot,period,redditSinceStartLabel)?snapshot:null};
}
/** A historical lookup never changes existing reports and only selects completed runs. */
export async function readStoredHistoricalReport(kind:'daily'|'weekly'|'monthly',start:string,end:string,channel:string,comparison?:{start:string;end:string}){
 if(channel==='social-media'&&kind==='weekly'){
  const local=await readLocalSocialReport('weekly');
  if(local?.en.period.start===start&&local.en.period.end===end&&(!comparison||local.en.comparison.start===comparison.start&&local.en.comparison.end===comparison.end)){
   const {mtime}=await stat(path.join(process.cwd(),'.state/content-testing-social/weekly/report.json'));
   return {id:local.en.run_id,generated_at:mtime,report:local};
  }
 }

 const result=await database().query<{id:string;generated_at:Date;report:unknown}>(`select r.id,r.completed_at as generated_at,p.report from content_testing_reports.runs r join content_testing_reports.reports p on p.run_id=r.id where r.status='completed' and r.report_kind=$1 and r.period_start=$2 and r.period_end=$3 and p.channel=$4 and ($5::date is null or (r.comparison_start=$5 and r.comparison_end=$6)) and r.environment=$7 order by r.completed_at desc,r.id desc limit 1`,[kind,start,end,channel,comparison?.start??null,comparison?.end??null,reportEnvironment()]);
 return result.rows[0]??null;
}

export async function readStoredWeeklyRun(start:string,end:string){
 const result=await database().query<{id:string}>("select r.id from content_testing_reports.runs r where r.status='completed' and r.environment='production' and r.report_kind='weekly' and r.period_start=$1 and r.period_end=$2 and (select count(distinct p.channel) from content_testing_reports.reports p where p.run_id=r.id and p.channel in ('overview','google-search','google-pmax','google-demand-gen','meta','reddit','edm','social-media'))=8 order by r.completed_at desc,r.id desc limit 1",[start,end]);
 return result.rows[0]?readStoredRun(result.rows[0].id):null;
}
export async function findReusableHistory(kind:string,start:string,end:string,compareStart:string,compareEnd:string,scope:string){
 const result=await database().query<{report:unknown}>(`select p.report from content_testing_reports.runs r join content_testing_reports.reports p on p.run_id=r.id where r.status='completed' and r.report_kind=$1 and r.period_start=$2 and r.period_end=$3 and r.comparison_start=$4 and r.comparison_end=$5 and p.channel=$6 and r.environment=$7 and r.prompt_versions->>'testing_scope_policy'='2026-11-10-campaign-v2' order by r.completed_at desc limit 1`,[kind,start,end,compareStart,compareEnd,scope,reportEnvironment()]);return result.rows[0]?.report??null;
}
export async function enqueueHistoryGeneration(id:string,environment:string,scope:string,period:{kind:string;start:string;end:string;compareStart:string;compareEnd:string},author:string,payload:unknown){
 const result=await database().query<{id:string;status:string}>(`insert into content_testing_reports.generation_requests(id,environment,scope,report_kind,period_start,period_end,comparison_start,comparison_end,author_sub,payload) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict (environment,scope,report_kind,period_start,period_end,comparison_start,comparison_end) where status in ('queued','running') do update set updated_at=content_testing_reports.generation_requests.updated_at returning id,status`,[id,environment,scope,period.kind,period.start,period.end,period.compareStart,period.compareEnd,author,JSON.stringify(payload)]);return result.rows[0];
}
export async function historyGenerationStatus(id:string,environment:string){
 const result=await database().query<{id:string;status:string;error:string|null}>('select id,status,error from content_testing_reports.generation_requests where id=$1 and environment=$2',[id,environment]);return result.rows[0]??null;
}
