import nextEnv from '@next/env';
import pg from 'pg';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {validateTrialResult} from '../../lib/testing-prompts-contract.ts';
nextEnv.loadEnvConfig(process.cwd());
if(process.env.DEPLOYMENT_ENV!=='staging'||!process.env.STAGING_PROMPTS_DATABASE_URL)throw Error('Staging prompt worker is not configured');
const remote=process.env.STAGING_PROMPTS_REMOTE;
if(remote&&!/^[a-zA-Z0-9][a-zA-Z0-9_@.-]{0,100}$/.test(remote))throw Error('Invalid preview SSH host');
const exec=promisify(execFile);
const pool=new pg.Pool({connectionString:process.env.STAGING_PROMPTS_DATABASE_URL,ssl:{rejectUnauthorized:false},max:2,connectionTimeoutMillis:10000});
const lock=await pool.connect();
if(!(await lock.query("select pg_try_advisory_lock(hashtext('staging-prompts-native-worker')) held")).rows[0].held)throw Error('A prompt worker is already active');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function update(id,stage,extra={}){
 await pool.query("UPDATE staging_testing_prompt_runs SET stage=$2,native_thread=COALESCE($3,native_thread),native_turn=COALESCE($4,native_turn),heartbeat_at=now(),updated_at=now() WHERE id=$1 AND status='running'",[id,stage,extra.thread_id??null,extra.turn_id??null]);
}
async function interruptPreview(job){
 const python=process.env.CONTENT_TESTING_PYTHON||'/home/ubuntu/work/anc-slack-bridge/.venv/bin/python';
 if(remote){const target='/home/ubuntu/.local/share/emw3-staging/prompt-runs/'+job.id;await exec('ssh',[remote,'env','PYTHONPATH=/home/ubuntu/work/anc-slack-bridge/src',python,target+'/native-preview.py','--root',target,'--interrupt']);}
 else await exec(python,['scripts/prompt-lab/native-preview.py','--root',join(process.env.STAGING_PROMPTS_RUN_DIR||join(process.cwd(),'.state/prompt-runs'),job.id),'--interrupt']);
}
function streamCommand(command,args,job){return new Promise((resolve,reject)=>{
 const child=spawn(command,args,{env:process.env,stdio:['ignore','pipe','inherit']});let buffer='',interrupting=false;
 const cancellation=setInterval(()=>void pool.query('SELECT status,error FROM staging_testing_prompt_runs WHERE id=$1',[job.id]).then(async result=>{if(result.rows[0]?.error==='user_cancelled'&&!interrupting){interrupting=true;try{await interruptPreview(job);}catch{interrupting=false;}}}).catch(()=>{}),4000);
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
 await exec('scp',['scripts/prompt-lab/native-preview.py',remote+':'+target+'/native-preview.py']);
 try{await streamCommand('ssh',['-o','ConnectTimeout=15',remote,'env','PYTHONPATH=/home/ubuntu/work/anc-slack-bridge/src',python,target+'/native-preview.py','--root',target],job);}
 finally{try{const {stdout}=await exec('ssh',['-o','ConnectTimeout=15',remote,'cat',target+'/native-state.json'],{maxBuffer:100000});await writeFile(join(root,'native-state.json'),stdout,{mode:0o600});}catch{/* A later recovery reads the same remote turn. */}}
 const {stdout}=await exec('ssh',['-o','ConnectTimeout=15',remote,'cat',target+'/result.json'],{maxBuffer:2000000});
 await writeFile(join(root,'result.json'),stdout,{mode:0o600});
}
async function execute(job){
 const root=join(process.env.STAGING_PROMPTS_RUN_DIR||join(process.cwd(),'.state/prompt-runs'),job.id);
 await mkdir(root,{recursive:true,mode:0o700});await writeFile(join(root,'input.json'),JSON.stringify(job),{mode:0o600});
 const heartbeat=setInterval(()=>void update(job.id,'working').catch(()=>{}),30000);
 try{
  let recovered=false;
  for(let attempt=0;attempt<3;attempt++){
   try{await nativePreview(job,root);recovered=true;break;}
   catch(error){let state={};try{state=JSON.parse(await readFile(join(root,'native-state.json'),'utf8'));}catch{}if(!state.turn_id||state.terminal_failed)throw error;await update(job.id,'recovering');if(attempt<2)await delay(5000);}
  }
  if(!recovered){await pool.query("UPDATE staging_testing_prompt_runs SET status='running',stage='recovering',error='Connection interrupted; recovering the existing native task.',updated_at=now() WHERE id=$1 AND status='running'",[job.id]);await delay(15000);return;}
  const result=validateTrialResult(JSON.parse(await readFile(join(root,'result.json'),'utf8')),job.frozen_input.campaigns);
  await pool.query("UPDATE staging_testing_prompt_runs SET status='completed',stage='completed',result=$2::jsonb,error=NULL,updated_at=now(),heartbeat_at=now() WHERE id=$1 AND status='running'",[job.id,JSON.stringify(result)]);
 }catch(error){await pool.query("UPDATE staging_testing_prompt_runs SET status='failed',stage='failed',error=$2,updated_at=now() WHERE id=$1 AND status='running'",[job.id,error.message]);console.error('Staging preview failed',job.id,error.message);}
 finally{clearInterval(heartbeat);}
}
while(true){
 try{await lock.query('BEGIN');const row=(await lock.query("SELECT * FROM staging_testing_prompt_runs WHERE status IN ('queued','running') ORDER BY CASE WHEN status='running' THEN 0 ELSE 1 END,created_at FOR UPDATE SKIP LOCKED LIMIT 1")).rows[0];if(row)await lock.query("UPDATE staging_testing_prompt_runs SET status='running',stage='waiting_for_agent',heartbeat_at=now(),updated_at=now() WHERE id=$1 AND status IN ('queued','running')",[row.id]);await lock.query('COMMIT');if(row)await execute(row);else await delay(4000);}
 catch(error){await lock.query('ROLLBACK').catch(()=>{});console.error('Staging prompt queue unavailable',error.message);await delay(10000);}
}
