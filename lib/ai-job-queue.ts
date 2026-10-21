import 'server-only';
import { Pool } from 'pg';
import { bilingualInsightJobId } from './ai-insight-job';
import { randomUUID } from 'node:crypto';

const pool=new Pool({connectionString:process.env.KLAVIYO_DATABASE_URL,ssl:{rejectUnauthorized:false},max:3});
export type QueuedJob={id:string;status:'queued'|'running'|'completed'|'failed';remote_id:string|null;result:unknown;error:string|null;body:Record<string,unknown>;updated_at:string|Date};
export async function enqueueAiJob(id:string,body:Record<string,unknown>):Promise<QueuedJob>{
 await pool.query(`insert into ai_job_queue(id,request_id,body,priority) values($1,$2,$3::jsonb,$4) on conflict(id) do nothing`,[id,randomUUID(),JSON.stringify(body),body.dashboard_id==='bluevua-testing-translation'?-5:body.mode==='question'?10:0]);
 return readAiJob(id);
}
export async function readAiJob(id:string):Promise<QueuedJob>{
 const result=await pool.query<QueuedJob>('select * from ai_job_queue where id=$1',[id]);
 if(!result.rows[0])throw new Error('AI task not found.');
 return result.rows[0];
}
export type TestingReadoutCacheRecord={cache_key:string;readout_type:"framework"|"period";period_label:string|null;period_start:string|null;period_end:string|null;comparison_label:string|null;comparison_start:string|null;comparison_end:string|null;prompt_version:string;payload:unknown;generated_at:string|Date;updated_at:string|Date};
export async function readTestingReadoutCache(keys:string[]){
 if(!keys.length)return [] as TestingReadoutCacheRecord[];
 const result=await pool.query<TestingReadoutCacheRecord>(`select cache_key,readout_type,period_label,period_start::text,period_end::text,comparison_label,comparison_start::text,comparison_end::text,prompt_version,payload,generated_at,updated_at from testing_ai_readout_cache where cache_key=any($1::text[])`,[keys]);
 return result.rows;
}
export async function writeTestingReadoutCache(input:Omit<TestingReadoutCacheRecord,"generated_at"|"updated_at">,sourceGeneratedAt?:string|Date){
 await pool.query(`insert into testing_ai_readout_cache(cache_key,readout_type,period_label,period_start,period_end,comparison_label,comparison_start,comparison_end,prompt_version,payload,generated_at) values($1,$2,$3,$4::date,$5::date,$6,$7::date,$8::date,$9,$10::jsonb,coalesce($11::timestamptz,now())) on conflict(cache_key) do update set readout_type=excluded.readout_type,period_label=excluded.period_label,period_start=excluded.period_start,period_end=excluded.period_end,comparison_label=excluded.comparison_label,comparison_start=excluded.comparison_start,comparison_end=excluded.comparison_end,prompt_version=excluded.prompt_version,payload=excluded.payload,generated_at=excluded.generated_at,updated_at=now() where testing_ai_readout_cache.generated_at<=excluded.generated_at`,[input.cache_key,input.readout_type,input.period_label,input.period_start,input.period_end,input.comparison_label,input.comparison_start,input.comparison_end,input.prompt_version,JSON.stringify(input.payload),sourceGeneratedAt??null]);
}
export async function existingInsightContext(input:{language?:string;range:{start:string;end:string};comparison:{start:string;end:string}}){
 const legacy=`summary:${input.language||'en'}:${input.range.start}:${input.range.end}:${input.comparison.start}:${input.comparison.end}`;
 const result=await pool.query<QueuedJob>('select body from ai_job_queue where id in ($1,$2) order by case when id=$1 then 0 else 1 end limit 1',[bilingualInsightJobId(input),legacy]);
 return result.rows[0]?.body.analysis_payload as Record<string,unknown>|undefined;
}

export async function completedTestingReadoutJobs(){
 const result=await pool.query<QueuedJob>(`select * from ai_job_queue where status='completed' and body->>'dashboard_id'='bluevua-content-testing' and result->>'testing_cache_published_at' is null and result->>'testing_cache_validation_error' is null order by created_at limit 5`);
 return result.rows;
}
export async function markTestingReadoutPublished(id:string){
 await pool.query(`update ai_job_queue set result=jsonb_set(result,'{testing_cache_published_at}',to_jsonb(now()::text)) where id=$1 and status='completed'`,[id]);
}
export async function markTestingReadoutValidationError(id:string){
 await pool.query(`update ai_job_queue set result=jsonb_set(result,'{testing_cache_validation_error}','"output_schema_invalid"'::jsonb) where id=$1 and status='completed'`,[id]);
}
