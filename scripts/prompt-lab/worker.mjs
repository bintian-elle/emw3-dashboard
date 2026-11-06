import {unlinkSync} from 'node:fs';
import nextEnv from '@next/env';
import pg from 'pg';
import {mkdir,writeFile,readFile,copyFile,readdir,rename,open,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {assembleTrialVisualResult} from '../../lib/testing-prompt-trial-report.ts';
import {validateTrialResult} from '../../lib/testing-prompts-contract.ts';
nextEnv.loadEnvConfig(process.cwd());
const localQueue=process.env.STAGING_PROMPTS_LOCAL_QUEUE==='1';
const queueRoot=join(process.cwd(),'.state/prompt-runs-local');
if(process.env.DEPLOYMENT_ENV!=='staging'||!localQueue&&!process.env.STAGING_PROMPTS_DATABASE_URL)throw Error('Staging prompt worker is not configured');
const remote=process.env.STAGING_PROMPTS_REMOTE;
if(remote&&!/^[a-zA-Z0-9][a-zA-Z0-9_@.-]{0,100}$/.test(remote))throw Error('Invalid preview SSH host');
const exec=promisify(execFile);
const pool=localQueue?null:new pg.Pool({connectionString:process.env.STAGING_PROMPTS_DATABASE_URL,ssl:{rejectUnauthorized:false},max:2,connectionTimeoutMillis:10000});
const lock=localQueue?null:await pool.connect();
if(lock&&!(await lock.query("select pg_try_advisory_lock(hashtext('staging-prompts-native-worker')) held")).rows[0].held)throw Error('A prompt worker is already active');
if(localQueue){
 await mkdir(queueRoot,{recursive:true});const file=join(queueRoot,'worker.lock');
 try{const pid=Number(await readFile(file,'utf8'));try{process.kill(pid,0);throw Error('A local prompt worker is already active');}catch(error){if(error.code!=='ESRCH')throw error;}await unlink(file);}catch(error){if(error.code!=='ENOENT')throw error;}
 const handle=await open(file,'wx',0o600);await handle.writeFile(String(process.pid));await handle.close();process.on('exit',()=>{try{unlinkSync(file);}catch{}});for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>process.exit(0));
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function localJob(id){return JSON.parse(await readFile(join(queueRoot,id,'job.json'),'utf8'));}
let localWrites=Promise.resolve();
function localUpdate(id,extra){const write=localWrites.then(async()=>{const file=join(queueRoot,id,'job.json'),temp=file+'.worker.tmp';await writeFile(temp,JSON.stringify({...await localJob(id),...extra,updated_at:new Date().toISOString()}),{mode:0o600});await rename(temp,file);});localWrites=write.catch(()=>{});return write;}
async function update(id,stage,extra={}){
 if(localQueue)return localUpdate(id,{stage,...extra});
 await pool.query("UPDATE staging_testing_prompt_runs SET stage=$2,native_thread=COALESCE($3,native_thread),native_turn=COALESCE($4,native_turn),heartbeat_at=now(),updated_at=now() WHERE id=$1 AND status='running'",[id,stage,extra.thread_id??null,extra.turn_id??null]);
}
async function interruptPreview(job){
 const python=process.env.CONTENT_TESTING_PYTHON||'/home/ubuntu/work/anc-slack-bridge/.venv/bin/python';
 if(remote){const target='/home/ubuntu/.local/share/emw3-staging/prompt-runs/'+job.id;await exec('ssh',[remote,'env','PYTHONPATH=/home/ubuntu/work/anc-slack-bridge/src',python,target+'/native-preview.py','--root',target,'--interrupt']);}
 else await exec(python,['scripts/prompt-lab/native-preview.py','--root',join(localQueue?queueRoot:process.env.STAGING_PROMPTS_RUN_DIR||join(process.cwd(),'.state/prompt-runs'),job.id),'--interrupt']);
}
function streamCommand(command,args,job){return new Promise((resolve,reject)=>{
 const child=spawn(command,args,{env:process.env,stdio:['ignore','pipe','inherit']});let buffer='',interrupting=false;
 const cancellation=setInterval(()=>void (localQueue?localJob(job.id).then(job=>({rows:[job]})):pool.query('SELECT status,error FROM staging_testing_prompt_runs WHERE id=$1',[job.id])).then(async result=>{if(result.rows[0]?.error==='user_cancelled'&&!interrupting){interrupting=true;try{await interruptPreview(job);}catch{/* Retry while any parallel turn is still starting. */}finally{interrupting=false;}}}).catch(()=>{}),4000);
 const finish=()=>clearInterval(cancellation);
 child.stdout.on('data',chunk=>{buffer+=chunk;let newline;while((newline=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,newline);buffer=buffer.slice(newline+1);try{const message=JSON.parse(line);void update(job.id,message.stage,message).catch(()=>{});}catch{/* SDK diagnostics stay in private worker logs. */}}});
 child.on('error',error=>{finish();reject(error);});child.on('exit',code=>{finish();if(code===0)resolve();else reject(Error('AI preview did not complete. Check the staging worker log.'));});
});}
async function nativePreview(job,root){
 const python='/home/ubuntu/work/anc-slack-bridge/.venv/bin/python';
 if(!remote)return streamCommand(process.env.CONTENT_TESTING_PYTHON||python,['scripts/prompt-lab/native-preview.py','--root',root],job);
 // Local development transport: isolated request/result files, no deployment or service installation.
 const target='/home/ubuntu/.local/share/emw3-staging/prompt-runs/'+job.id;
 await exec('ssh',['-o','ConnectTimeout=15',remote,'mkdir','-p',target]);
 await exec('scp',[join(root,'input.json'),remote+':'+target+'/input.json']);
 if(job.frozen_input.visual_context)await exec('scp',['-r',join(root,'media'),remote+':'+target+'/']);
 await exec('scp',['scripts/prompt-lab/native-preview.py',remote+':'+target+'/native-preview.py']);
 await exec('scp',['scripts/prompt-lab/staged_generation.py',remote+':'+target+'/staged_generation.py']);
 try{await streamCommand('ssh',['-o','ConnectTimeout=15',remote,'env','PYTHONPATH=/home/ubuntu/work/anc-slack-bridge/src',python,target+'/native-preview.py','--root',target],job);}
 finally{try{const {stdout}=await exec('ssh',['-o','ConnectTimeout=15',remote,'cat',target+'/native-state.json'],{maxBuffer:100000});await writeFile(join(root,'native-state.json'),stdout,{mode:0o600});}catch{/* A later recovery reads the same remote turn. */}}
 const {stdout}=await exec('ssh',['-o','ConnectTimeout=15',remote,'cat',target+'/result.json'],{maxBuffer:2000000});
 await writeFile(join(root,'result.json'),stdout,{mode:0o600});
}
async function execute(job){
 const root=join(localQueue?queueRoot:process.env.STAGING_PROMPTS_RUN_DIR||join(process.cwd(),'.state/prompt-runs'),job.id);
 await mkdir(root,{recursive:true,mode:0o700});
 if(job.frozen_input.visual_context&&!job.versions.translation&&!job.frozen_input.chat){
  job.output_schema=JSON.parse(await readFile('scripts/content-testing/readable-schema.json','utf8'));
  const target=remote?'/home/ubuntu/.local/share/emw3-staging/prompt-runs/'+job.id:root;
  const index=job.frozen_input.media_index??[];await mkdir(join(root,'media'),{recursive:true});
  for(const media of index){if(!/^[-\w]+\.webp$/.test(media.file))throw Error('Invalid registered media file');await copyFile(join(job.frozen_input.media_directory,media.file),join(root,'media',media.file));media.source_path=join(target,'media',media.file);}
 }
 await writeFile(join(root,'input.json'),JSON.stringify(job),{mode:0o600});
 const heartbeat=setInterval(()=>void update(job.id,'working').catch(()=>{}),30000);
 try{
  let recovered=false;
  for(let attempt=0;attempt<3;attempt++){
   try{await nativePreview(job,root);recovered=true;break;}
   catch(error){let state={};try{state=JSON.parse(await readFile(join(root,'native-state.json'),'utf8'));}catch{}if(!state.turn_id||state.terminal_failed)throw error;await update(job.id,'recovering');if(attempt<2)await delay(5000);}
  }
  if(!recovered){if(localQueue)await localUpdate(job.id,{status:'running',stage:'recovering',error:'Connection interrupted; recovering the existing native task.'});else await pool.query("UPDATE staging_testing_prompt_runs SET status='running',stage='recovering',error='Connection interrupted; recovering the existing native task.',updated_at=now() WHERE id=$1 AND status='running'",[job.id]);await delay(15000);return;}
  const raw=JSON.parse(await readFile(join(root,'result.json'),'utf8'));
  let result;
  if(job.frozen_input.visual_context&&raw.en&&raw.zh){
   const visual=assembleTrialVisualResult(raw,job.frozen_input.visual_context,job.language,job.id);
   for(const report of Object.values(visual.reports))report.media_url_base='/api/testing/prompts/media/'+job.id+'/';
   result={title:visual.report.presentation.title,summary:visual.report.presentation.summary,sections:[],campaigns:visual.report.analysis.campaigns.map(c=>({id:c.test_id,summary:c.summary,markdown:c.detail_markdown})),html:null,...visual};
  }else result=raw;
  if(job.frozen_input.overview_sources)result.overview_sources=job.frozen_input.overview_sources.map(source=>{const {content,...metadata}=source;void content;return metadata;});
  validateTrialResult(result,job.frozen_input.campaigns);
  if(localQueue)await localUpdate(job.id,{status:'completed',stage:'completed',result,error:null});else await pool.query("UPDATE staging_testing_prompt_runs SET status='completed',stage='completed',result=$2::jsonb,error=NULL,updated_at=now(),heartbeat_at=now() WHERE id=$1 AND status='running'",[job.id,JSON.stringify(result)]);
 }catch(error){if(localQueue)await localUpdate(job.id,{status:'failed',stage:'failed',error:error.message});else await pool.query("UPDATE staging_testing_prompt_runs SET status='failed',stage='failed',error=$2,updated_at=now() WHERE id=$1 AND status='running'",[job.id,error.message]);console.error('Staging preview failed',job.id,error.message);}
 finally{clearInterval(heartbeat);}
}
while(true){
 if(localQueue){
  await mkdir(queueRoot,{recursive:true});const names=(await readdir(queueRoot)).filter(name=>/^[a-f0-9-]{36}$/.test(name));const jobs=await Promise.all(names.map(localJob));const row=jobs.filter(job=>['queued','running'].includes(job.status)).sort((a,b)=>(a.status==='running'?0:1)-(b.status==='running'?0:1)||Date.parse(a.created_at)-Date.parse(b.created_at))[0];if(row){await localUpdate(row.id,{status:'running',stage:'waiting_for_agent'});await execute(row);}else await delay(4000);continue;
 }
 try{await lock.query('BEGIN');const row=(await lock.query("SELECT * FROM staging_testing_prompt_runs WHERE status IN ('queued','running') ORDER BY CASE WHEN status='running' THEN 0 ELSE 1 END,created_at FOR UPDATE SKIP LOCKED LIMIT 1")).rows[0];if(row)await lock.query("UPDATE staging_testing_prompt_runs SET status='running',stage='waiting_for_agent',heartbeat_at=now(),updated_at=now() WHERE id=$1 AND status IN ('queued','running')",[row.id]);await lock.query('COMMIT');if(row)await execute(row);else await delay(4000);}
 catch(error){await lock.query('ROLLBACK').catch(()=>{});console.error('Staging prompt queue unavailable',error.message);await delay(10000);}
}
