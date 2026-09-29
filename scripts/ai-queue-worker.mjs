import nextEnv from '@next/env';
import pg from 'pg';
import { createHmac } from 'node:crypto';
nextEnv.loadEnvConfig(process.cwd());
const pool=new pg.Pool({connectionString:process.env.KLAVIYO_DATABASE_URL,ssl:{rejectUnauthorized:false},max:1});
const base=process.env.CODEX_BRIDGE_URL?.replace(/\/$/,'');
const key=process.env.CODEX_BRIDGE_API_KEY;
if(!base||!key)throw new Error('Bridge configuration missing');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function finalize(){
 const rows=await pool.query(`select * from ai_job_queue where status='completed' and finalized=false and body->>'mode' in ('insights','suggested_questions') order by created_at limit 1`);
 const job=rows.rows[0];if(!job)return;
 const body=job.body;
 const cookie=createHmac('sha256',process.env.SITE_ACCESS_KEY.trim()).update('emw3-dashboard-access-v1').digest('hex');
 const response=await fetch('http://127.0.0.1:3000/api/klaviyo/ask',{method:'POST',headers:{'content-type':'application/json',cookie:`emw3_access=${cookie}`},body:JSON.stringify({mode:'summary',language:body.language==='zh-CN'?'zh':'en',range:body.period,comparison:body.comparison,presetLabel:body.preset_label,comparisonLabel:body.comparison_label}),signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw new Error(`Finalize HTTP ${response.status}`);
 await pool.query('update ai_job_queue set finalized=true where id=$1',[job.id]);
}
async function tick(){
 const client=await pool.connect();
 let activeJob;
 try{
  await client.query('begin');
  const lock=await client.query('select pg_try_advisory_xact_lock(72929001) locked');
  if(!lock.rows[0].locked){await client.query('rollback');return}
  // An unresolved remote job blocks all new submissions, including after restarts.
  const rows=await client.query(`select * from ai_job_queue where status in ('queued','running') order by (status='running') desc,priority desc,created_at limit 1 for update`);
  const job=rows.rows[0];
  activeJob=job;
  if(!job||new Date(job.next_poll_at)>new Date()){await client.query('commit');return}
  const response=await fetch(job.remote_id?`${base}/v1/codex/jobs/${job.remote_id}`:`${base}/v1/codex/jobs`,{
   method:job.remote_id?'GET':'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},
   ...(job.remote_id?{}:{body:JSON.stringify({...job.body,request_id:job.request_id})}),signal:AbortSignal.timeout(20000)
  });
  if(response.status===429){
   const delay=Math.max(15,Number(response.headers.get('retry-after'))||30);
   await client.query(`update ai_job_queue set next_poll_at=now()+$2*interval '1 second',updated_at=now() where id=$1`,[job.id,delay]);
  }else{
   const payload=await response.json();
   if(!response.ok)throw new Error(`Bridge HTTP ${response.status}: ${payload?.error?.code||'error'}`);
   if(!payload.job_id||!['queued','running','completed','failed','cancelled'].includes(payload.status))throw new Error('Invalid Bridge envelope');
   const status=payload.status==='completed'?'completed':['failed','cancelled'].includes(payload.status)?'failed':'running';
   await client.query(`update ai_job_queue set remote_id=$2,status=$3,result=$4::jsonb,error=$5,next_poll_at=now()+interval '5 seconds',updated_at=now() where id=$1`,[job.id,payload.job_id,status,JSON.stringify(payload.result),payload.error?JSON.stringify(payload.error):null]);
   if(status==='completed'||status==='failed')console.log(JSON.stringify({id:job.id,status}));
  }
  await client.query('commit');
 }catch(error){
  if(activeJob){
   // Keep the global slot occupied if submission or polling has an uncertain outcome.
   try{await client.query(`update ai_job_queue set status='running',error=$2,next_poll_at=now()+interval '30 seconds' where id=$1`,[activeJob.id,error.message]);await client.query('commit')}
   catch{await client.query('rollback').catch(()=>{})}
  }else await client.query('rollback').catch(()=>{});
  // Unknown submission outcomes retain the same request_id for idempotent recovery.
  console.error(error.message);
  await pause(15000);
 }finally{client.release()}
}
while(true){await tick();try{await finalize()}catch(error){console.error(error.message)}await pause(2000)}
