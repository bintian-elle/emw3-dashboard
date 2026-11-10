import 'server-only';
import {Pool} from 'pg';
import {assembleStoredBundle} from './testing-report-store';
import {reportDatabaseEnvironment} from './testing-report-environment';
import {reportDatabaseConfig} from '../scripts/content-testing/report-database.mjs';
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

export async function readStoredRedditLifetime(){
 const result=await database().query<{id:string;start:string;end:string;report:unknown}>(`select r.id,to_char(r.period_start,'YYYY-MM-DD') as start,to_char(r.period_end,'YYYY-MM-DD') as end,p.report from content_testing_reports.runs r join content_testing_reports.reports p on p.run_id=r.id where r.status='completed' and r.environment=$1 and p.channel='reddit-lifetime' and p.scope='lifetime' order by r.completed_at desc,r.id desc limit 1`,[reportEnvironment()]);
 const row=result.rows[0];if(!row)return null;
 const pair=assembleStoredBundle(row.id,row.start,row.end,[{channel:'reddit-lifetime',report:row.report}]).reports['reddit-lifetime'];
 if(pair.en.scope!=='lifetime'||pair.zh.scope!=='lifetime')return null;
 for(const report of [pair.en,pair.zh])report.media_url_base=`/api/testing/history/media/${encodeURIComponent(row.id)}/`;
 return pair;
}
/** A historical lookup never changes existing reports and only selects completed runs. */
export async function readStoredHistoricalReport(kind:'daily'|'weekly'|'monthly',start:string,end:string,channel:string,comparison?:{start:string;end:string}){
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
