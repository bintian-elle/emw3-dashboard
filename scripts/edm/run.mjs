import nextEnv from '@next/env';import pg from 'pg';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';import {randomUUID} from 'node:crypto';import path from 'node:path';
import {edmDatabaseConfig} from '../../lib/edm-database.mjs';import {KlaviyoReader} from './api.mjs';import {collect,setup,safeError} from './collect.mjs';import {resolveWindow,dueAttempt,easternDay,recordResult,tryPendingNotice} from './policy.mjs';import {notifyTesting} from '../testing-refresh/notifications.mjs';import {parseDate} from '@internationalized/date';
nextEnv.loadEnvConfig(process.cwd());
const directory=process.env.EDM_REFRESH_STATE_DIR||'.state/edm-refresh',file=path.join(directory,'status.json');
async function save(state){await mkdir(directory,{recursive:true,mode:0o700});const temp=file+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(state),{mode:0o600});await rename(temp,file);}
async function main(){
 if(!process.env.EDM_DATABASE_URL)throw Error('Dedicated EDM database required');
 const db=new pg.Client({...edmDatabaseConfig(),connectionTimeoutMillis:12000,statement_timeout:60000});let locked=false,state={};
 try{
  await db.connect();locked=(await db.query('select pg_try_advisory_lock(7348411) as locked')).rows[0].locked;if(!locked){console.log('EDM refresh already running');return;}
  try{state=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  const now=new Date(),scheduled=process.argv.includes('--scheduled');
  // A successful data run whose Slack send failed must retry delivery without recollecting.
  const pending=await tryPendingNotice(state,{save,send:notifyTesting});state=pending.state;if(pending.deferred)console.warn('EDM notice delivery deferred; data collection remains enabled');
  if(scheduled&&!dueAttempt(state,now)){console.log('EDM collection not due');if(pending.deferred)process.exitCode=1;return;}
  await setup(db);const arg=name=>{const index=process.argv.indexOf(name);return index<0?undefined:process.argv[index+1];};let range=resolveWindow(now,{start:arg('--start'),end:arg('--end')});
  if(!arg('--start')){const oldest=(await db.query('SELECT min(end_day)::text oldest FROM edm_refresh_coverage')).rows[0]?.oldest;if(oldest&&oldest<range.start)range=resolveWindow(now,{start:oldest,end:range.end});}
  if(state.day!==easternDay(now))state={...state,day:easternDay(now),attempts:0,success:false};state={...state,lastAttempt:now.toISOString(),attempts:(state.attempts??0)+1,success:false};await save(state);
  const run=(await db.query(`INSERT INTO edm_refresh_runs(status,range_start,range_end) VALUES('running',$1,$2) RETURNING id`,[range.start,range.end])).rows[0].id;
  let outcomes;
  try{outcomes=await collect(db,new KlaviyoReader(),{...range,resume:scheduled||process.argv.includes('--resume'),force:arg('--force-domain')?[arg('--force-domain')]:[],onProgress:item=>console.log(JSON.stringify(item))});}catch(error){outcomes={setup:{ok:false,error:safeError(error)}};}
  const success=['metrics','flows','campaigns','links','subscribers'].every(k=>outcomes[k]?.ok);await db.query(`UPDATE edm_refresh_runs SET finished_at=now(),status=$2,details=$3::jsonb WHERE id=$1`,[run,success?'success':'failed',JSON.stringify(outcomes)]);
  await recordResult(state,outcomes,{through:parseDate(range.end).subtract({days:1}).toString(),save,send:notifyTesting,notifyFailure:!scheduled||state.attempts>=2,knownIncident:process.argv.includes('--migration')});
  console.log(JSON.stringify({success,range}));if(!success)process.exitCode=1;
 }finally{if(locked)await db.query('select pg_advisory_unlock(7348411)').catch(()=>{});await db.end().catch(()=>{});}
}
main().catch(error=>{console.error(JSON.stringify({error:safeError(error)}));process.exitCode=1;});
