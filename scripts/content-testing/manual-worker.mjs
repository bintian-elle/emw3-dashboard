import env from '@next/env';import pg from 'pg';import {readFile,writeFile,mkdir,copyFile,rename,rm} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import path from 'node:path';
import {assembleTrialVisualResult,assembleSingleTrialVisualResult} from '../../lib/testing-prompt-trial-report.ts';
import {orchestrateManualReports} from './manual-orchestration.mjs';
import {storeReportBundle} from './report-store.mjs';
import {collectCreativeEvidence} from './creative-evidence.mjs';
import {reportDatabaseConfig} from './report-database.mjs';
env.loadEnvConfig(process.cwd());
const id=process.argv[2],temporary=process.argv[3]==='temporary',environment=process.argv[4];if(!/^[a-f0-9-]{36}$/.test(id??'')||!['staging','production'].includes(environment))throw Error('Invalid request');
const db=new pg.Client({...reportDatabaseConfig(),connectionTimeoutMillis:15000});const exec=promisify(execFile);
const root=path.resolve(temporary?`.state/content-testing-temporary/${environment}`:'.state/content-testing-manual',id),remoteHost=process.env.CONTENT_TESTING_MANUAL_EXECUTION==='local'?'':process.env.CONTENT_TESTING_MANUAL_SSH||(process.cwd().startsWith('/home/ubuntu/')?'':'EMW3_ANC_AI');
if(remoteHost&&!/^[a-zA-Z0-9][a-zA-Z0-9_@.-]{0,100}$/.test(remoteHost))throw Error('Invalid AI host');
const python=process.env.CONTENT_TESTING_PYTHON||'/home/ubuntu/work/anc-slack-bridge/.venv/bin/python';
const source=path.resolve('scripts/prompt-lab');
const run=(program,args)=>exec(program,args,{cwd:process.cwd(),env:process.env,maxBuffer:2000000,timeout:7200000});
let tempJob,lockOwned=false,claimed=false;
async function updateTemporary(extra){const name=path.join(root,'job.json'),current=JSON.parse(await readFile(name,'utf8'));if(current.id!==id)throw Error('Invalid job');const tmp=path.join(root,`job-worker-${process.pid}.tmp`);await writeFile(tmp,JSON.stringify({...current,...extra}),{mode:0o600});await rename(tmp,name);}
if(!temporary)await db.connect();
try{
 let request;
 if(temporary){try{await mkdir(path.join(root,'worker-lock'),{mode:0o700});lockOwned=true;}catch(error){if(error.code==='EEXIST')process.exit(0);throw error;}tempJob=JSON.parse(await readFile(path.join(root,'job.json'),'utf8'));if(tempJob.status!=='queued')throw Error('Job is not queued');await updateTemporary({status:'running'});request={scope:tempJob.scope,payload:tempJob.payload};}
 else{const claim=await db.query("update content_testing_reports.generation_requests set status='running',updated_at=now() where id=$1 and status='queued' returning *",[id]);if(!claim.rows.length){await db.end();process.exit(0);}claimed=true;request=claim.rows[0];}
 const payload=request.payload,period=payload.period,media=new Map();
 await mkdir(root,{recursive:true,mode:0o700});
 async function generate(channel,sources){
  const job=structuredClone(payload.jobs[channel]);if(!job)throw Error(`Missing input for ${channel}`);
  const folder=path.join(root,channel),remote=`/tmp/content-testing-manual-${id}/${channel}`;await mkdir(path.join(folder,'media'),{recursive:true,mode:0o700});
  if(!remoteHost&&!(job.frozen_input.media_index??[]).length){
   const found=await collectCreativeEvidence({library:process.env.CONTENT_TESTING_CREATIVE_LIBRARY||'/home/ubuntu/work/emw3-anc/bluevua/.local/creative-library',output:path.join(folder,'media'),channel:job.period.channel,campaigns:job.frozen_input.campaigns??[]});
   job.frozen_input.media_index=found;job.frozen_input.media_directory=path.join(folder,'media');job.frozen_input.visual_context.media=found;
  }
  const index=job.frozen_input.media_index??[],directory=job.frozen_input.media_directory;
  for(const item of index){
   if(!directory||!/^[-\w]+\.webp$/.test(item.file)||!/^[a-f0-9]{64}$/.test(item.sha256))throw Error('Invalid media input');
   const data=await readFile(path.join(directory,item.file));if(createHash('sha256').update(data).digest('hex')!==item.sha256)throw Error('Media checksum mismatch');
   const previous=media.get(item.key);if(previous&&previous.sha256!==item.sha256)throw Error('Media key conflict');
   media.set(item.key,{key:item.key,mimeType:'image/webp',sha256:item.sha256,body:data,metadata:item});if(path.resolve(directory)!==path.resolve(folder,'media'))await copyFile(path.join(directory,item.file),path.join(folder,'media',item.file));
   item.source_path=path.join(remoteHost?remote:folder,'media',item.file);
  }
  if(channel==='overview'){job.frozen_input.completed_channel_reports=sources.map(x=>({channel:x.channel,content:x.content}));job.frozen_input.overview_sources=sources.map(x=>({channel:x.channel,kind:'saved-or-same-run'}));}
  job.id=`${id}-${channel}`;job.frozen_input.visual_context.run_id=id;
  await writeFile(path.join(folder,'input.json'),JSON.stringify(job),{mode:0o600});
  await copyFile(path.join(source,'native-preview.py'),path.join(folder,'native-preview.py'));await copyFile(path.join(source,'staged_generation.py'),path.join(folder,'staged_generation.py'));
  if(remoteHost){
   await run('ssh',[remoteHost,'mkdir','-p',remote]);await run('scp',['-r',`${folder}/.`,`${remoteHost}:${remote}/`]);
   await run('ssh',[remoteHost,'env','PYTHONPATH=/home/ubuntu/work/anc-slack-bridge/src',python,`${remote}/native-preview.py`,'--root',remote]);
   const {stdout}=await run('ssh',[remoteHost,'cat',`${remote}/result.json`]);await writeFile(path.join(folder,'result.json'),stdout,{mode:0o600});
  }else await run(python,[path.join(folder,'native-preview.py'),'--root',folder]);
  const raw=JSON.parse(await readFile(path.join(folder,'result.json'),'utf8'));
  const context=job.frozen_input.visual_context,language=temporary?payload.language:'en';
  const reports=temporary?{[language]:assembleSingleTrialVisualResult(raw,context,language,id)}:assembleTrialVisualResult(raw,context,'en',id).reports;
  const expected=job.frozen_input.campaigns??[];for(const lang of temporary?[language]:['en','zh'])if(reports[lang].analysis.campaigns.length!==expected.length||reports[lang].analysis.campaigns.some(x=>!expected.includes(x.test_id)))throw Error('Campaign coverage mismatch');
  return reports;
 }
 const saved=Object.fromEntries(Object.entries(payload.saved??{}).map(([channel,pair])=>[channel,pair]));
 const reports=await orchestrateManualReports({scope:request.scope,campaign:payload.campaign,temporary,channels:['google-search','google-pmax','google-demand-gen','meta','reddit','edm','social-media'],saved,generate});
 const versions={...Object.fromEntries(Object.entries(payload.jobs).map(([key,job])=>[key,Object.fromEntries(Object.entries(job.versions).map(([name,value])=>[name,createHash('sha256').update(value.content).digest('hex')]))])),testing_scope_policy:'2026-11-10-campaign-v2'};
 const rows=Object.entries(reports).map(([channel,report])=>['reddit-lifetime','social-lifetime'].includes(channel)
  ?{channel,scope:'lifetime',report:{...report,dashboard_snapshot:payload.lifetimeSnapshot}}
  :{channel,scope:'period',report});
 if(temporary){
  await mkdir(path.join(root,'media'),{recursive:true,mode:0o700});const index={};for(const item of media.values()){if(!/^[a-zA-Z0-9-]{1,100}$/.test(item.key))throw Error('Invalid media key');const file=`${item.key}.webp`;await writeFile(path.join(root,'media',file),item.body,{mode:0o600});index[item.key]=file;}
  const report=reports[request.scope];for(const lang of [payload.language])report[lang].media_url_base=`/api/testing/history/generate/media/${id}/`;
  await updateTemporary({status:'completed',result:report,media:index});
 }else{
 await storeReportBundle(db,{run:{id,environment,kind:period.kind,start:period.start,end:period.end,compareStart:period.compareStart,compareEnd:period.compareEnd,sourceCheckedAt:new Date().toISOString(),promptVersions:versions},reports:rows,media:[...media.values()]});
 await db.query("update content_testing_reports.generation_requests set status='completed',run_id=$2,updated_at=now() where id=$1",[id,id]);}
}catch(error){const message=String(error?.message??error).slice(0,500);if(temporary){if(lockOwned)await updateTemporary({status:'failed',error:message}).catch(()=>{});}else if(claimed)await db.query("update content_testing_reports.generation_requests set status='failed',error=$2,updated_at=now() where id=$1",[id,message]);console.error('Manual report generation failed');process.exitCode=1;}
finally{if(remoteHost)await run('ssh',[remoteHost,'rm','-rf',`/tmp/content-testing-manual-${id}`]).catch(()=>{});if(temporary){if(lockOwned)await rm(path.join(root,'worker-lock'),{recursive:true,force:true}).catch(()=>{});}else await db.end();}
