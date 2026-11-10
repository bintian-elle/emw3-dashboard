import env from '@next/env';
import pg from 'pg';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {easternClock} from '../testing-refresh/policy.mjs';
import {refreshRecords} from './report-readiness.mjs';
import {runScheduledReports} from './scheduled-reports.mjs';
import {reportDatabaseConfig} from './report-database.mjs';

env.loadEnvConfig(process.cwd());
const secret=process.env.CRON_SECRET?.trim()||process.env.AI_WORKER_SECRET?.trim();
if(!secret)throw Error('Internal generation credential missing');
const now=new Date(),{day}=easternClock(now),root=path.resolve('.state/testing-refresh',day);
async function phase(name){try{return JSON.parse(await readFile(path.join(root,`${name}.json`),'utf8'));}catch(error){if(error.code==='ENOENT')return {};throw error;}}
const data=await phase('data'),records=refreshRecords(data,await phase('google'));
const db=new pg.Client({...reportDatabaseConfig(),connectionTimeoutMillis:15000});await db.connect();
try{
 const lock=await db.query('select pg_try_advisory_lock(72929004) as locked');if(!lock.rows[0].locked)throw Error('Scheduled report generation is already running');
 async function complete(period,lifetime=null){
  const channels=lifetime?[lifetime]:['overview','google-search','google-pmax','google-demand-gen','meta','reddit','edm','social-media'];
  const result=await db.query("select count(distinct p.channel)::int as channels from content_testing_reports.runs r join content_testing_reports.reports p on p.run_id=r.id where r.environment='production' and r.status='completed' and r.report_kind=$1 and r.period_start=$2 and r.period_end=$3 and r.comparison_start=$4 and r.comparison_end=$5 and p.channel=any($6::text[]) and p.scope=$7",[period.kind,period.start,period.end,period.compareStart,period.compareEnd,channels,lifetime?'lifetime':'period']);
  return result.rows[0].channels===channels.length;
 }
 async function generate(period,lifetime=null){
  const selection=lifetime?{scope:lifetime==='social-lifetime'?'social-media':'reddit',coverage:'lifetime'}:{scope:'overview'};
  const response=await fetch('http://127.0.0.1:3000/api/testing/history/generate',{method:'POST',headers:{authorization:`Bearer ${secret}`,'content-type':'application/json'},body:JSON.stringify({...selection,frequency:period.kind,start:period.start,end:period.end,compareStart:period.compareStart,compareEnd:period.compareEnd}),signal:AbortSignal.timeout(600000)});
  const body=await response.json();if(!response.ok)throw Error(`Could not prepare ${period.kind} report: ${body.error??response.status}`);
  if(body.job?.status==='completed'){if(!await complete(period,lifetime))throw Error(`Saved ${period.kind} report is incomplete`);return;}
  const id=body.job?.id;if(!/^[a-f0-9-]{36}$/.test(id??''))throw Error('Generation did not return a job');
  const deadline=Date.now()+20*60*60*1000;
  while(Date.now()<deadline){
   const state=await db.query("select status,error from content_testing_reports.generation_requests where id=$1 and environment='production'",[id]);
   const job=state.rows[0];if(!job)throw Error('Scheduled generation job disappeared');
   if(job.status==='failed')throw Error(`Scheduled generation failed: ${job.error??'unknown error'}`);
   if(job.status==='completed'){if(!await complete(period,lifetime))throw Error(`Generated ${period.kind} report is incomplete`);return;}
   await new Promise(resolve=>setTimeout(resolve,15000));
  }
  throw Error('Scheduled generation timed out');
 }
 const lifetimeTask=(channel,snapshot)=>({snapshot,hasReport:period=>complete(period,channel),generate:period=>generate(period,channel)});
 const redditLifetime=lifetimeTask('reddit-lifetime',data.items?.['reddit:sinceSep24']);
 const socialLifetime=lifetimeTask('social-lifetime',records['social-media']);
 const generated=await runScheduledReports({day,now:now.toISOString(),records,hasReport:complete,generate,redditLifetime,socialLifetime});
 console.log(JSON.stringify({day,generated:generated.map(item=>item.coverage??item.kind)}));
}finally{await db.end();}
