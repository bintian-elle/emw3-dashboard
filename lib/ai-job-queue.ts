import 'server-only';
import { Pool } from 'pg';
import { bilingualInsightJobId } from './ai-insight-job';
import { randomUUID } from 'node:crypto';

const pool=new Pool({connectionString:process.env.KLAVIYO_DATABASE_URL,ssl:{rejectUnauthorized:false},max:3});
export type QueuedJob={id:string;status:'queued'|'running'|'completed'|'failed';remote_id:string|null;result:unknown;error:string|null;body:Record<string,unknown>};
export async function enqueueAiJob(id:string,body:Record<string,unknown>):Promise<QueuedJob>{
 await pool.query(`insert into ai_job_queue(id,request_id,body,priority) values($1,$2,$3::jsonb,$4) on conflict(id) do nothing`,[id,randomUUID(),JSON.stringify(body),body.mode==='question'?10:0]);
 return readAiJob(id);
}
export async function readAiJob(id:string):Promise<QueuedJob>{
 const result=await pool.query<QueuedJob>('select * from ai_job_queue where id=$1',[id]);
 if(!result.rows[0])throw new Error('AI task not found.');
 return result.rows[0];
}
export async function existingInsightContext(input:{language?:string;range:{start:string;end:string};comparison:{start:string;end:string}}){
 const legacy=`summary:${input.language||'en'}:${input.range.start}:${input.range.end}:${input.comparison.start}:${input.comparison.end}`;
 const result=await pool.query<QueuedJob>('select body from ai_job_queue where id in ($1,$2) order by case when id=$1 then 0 else 1 end limit 1',[bilingualInsightJobId(input),legacy]);
 return result.rows[0]?.body.analysis_payload as Record<string,unknown>|undefined;
}
