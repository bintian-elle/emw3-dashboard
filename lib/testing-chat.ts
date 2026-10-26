import "server-only";
import {PMAX_TESTING_BASIS} from "@/lib/pmax-testing-performance";
import type { BridgeChatAttachment } from "./ai-chat-attachment-contract";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { enqueueAiJob } from "@/lib/ai-job-queue";
import { loadTestingChatContext } from "@/lib/testing-chat-context";
import type { SiteUser } from "@/lib/site-auth";
import type { TestingChatScope } from "@/lib/testing-chat-contract";
const pool=new Pool({connectionString:process.env.KLAVIYO_DATABASE_URL,ssl:{rejectUnauthorized:false},max:2,connectionTimeoutMillis:12000});
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export const testingChatOwner=(user:SiteUser)=>digest(`testing-chat\0${user.sub}`);
export function validTestingConversation(value:unknown):value is string{return typeof value==='string'&&(value==='default'||/^[0-9a-f-]{36}$/.test(value));}
const ownSql="body->>'dashboard_id'='bluevua-testing-chat' and body->'analysis_payload'->'chat'->>'owner'=$1";
function publicJob(row:Record<string,unknown>){const body=row.body as {latest_user_message:string;analysis_payload:{chat:{scope:TestingChatScope;conversationId:string};entity_count:number;navigation_links:unknown[]};attachments?:BridgeChatAttachment[]};return {attachments:body.attachments?.map(({kind,name})=>({kind,name})),id:row.id,status:row.status,stopped:row.error==='user_cancelled',question:body.latest_user_message,answer:(row.result as {answer_markdown?:string}|null)?.answer_markdown??null,scope:body.analysis_payload.chat.scope,conversationId:body.analysis_payload.chat.conversationId,entityCount:body.analysis_payload.entity_count,links:body.analysis_payload.navigation_links,createdAt:row.created_at,...(row.status==='failed'&&row.error!=='user_cancelled'?{error:'AI Bluevua could not finish this request. Start a new conversation or try again.'}:{})};}
export async function testingChatConversations(user:SiteUser){const result=await pool.query(`select distinct on (body->'analysis_payload'->'chat'->>'conversationId') body->'analysis_payload'->'chat'->>'conversationId' id,body->>'latest_user_message' title,created_at from ai_job_queue where ${ownSql} order by body->'analysis_payload'->'chat'->>'conversationId',created_at desc`,[testingChatOwner(user)]);return result.rows.sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,50);}
export async function latestTestingConversation(user:SiteUser){const row=await pool.query(`select body->'analysis_payload'->'chat'->>'conversationId' id from ai_job_queue where ${ownSql} order by created_at desc limit 1`,[testingChatOwner(user)]);return row.rows[0]?.id??'default';}
export async function testingChatHistory(user:SiteUser,conversationId:string){const result=await pool.query(`select * from (select * from ai_job_queue where ${ownSql} and body->'analysis_payload'->'chat'->>'conversationId'=$2 order by created_at desc limit 100) history order by created_at`,[testingChatOwner(user),conversationId]);return result.rows.map(publicJob);}
export async function testingChatJob(user:SiteUser,id:string){const result=await pool.query(`select * from ai_job_queue where ${ownSql} and id=$2`,[testingChatOwner(user),id]);return result.rows[0]?publicJob(result.rows[0]):null;}
export async function startTestingChat(user:SiteUser,input:{scope:TestingChatScope;question:string;conversationId:string;requestId:string;language:string;comparisons:string[];attachments?:BridgeChatAttachment[]},signal:AbortSignal){
 if(!process.env.CODEX_BRIDGE_URL||!process.env.CODEX_BRIDGE_API_KEY)throw Error('AI Bluevua is not configured on the server.');
 const owner=testingChatOwner(user),id=`testing-chat:${owner}:${input.requestId}`;
 const existing=await testingChatJob(user,id);if(existing)return existing;
 const [context,prompt,previous]=await Promise.all([loadTestingChatContext(input.scope,input.comparisons),readFile(path.join(process.cwd(),'prompts/ask-ai/testing.md'),'utf8'),pool.query(`select body->>'latest_user_message' question,result->>'answer_markdown' answer,body->'analysis_payload'->'chat'->'scope' scope,body->'analysis_payload'->'metric_basis' metric_basis,error from ai_job_queue where ${ownSql} and body->'analysis_payload'->'chat'->>'conversationId'=$2 order by created_at desc limit 12`,[owner,input.conversationId])]);
 if(signal.aborted)throw new DOMException('Cancelled','AbortError');
 // A cancelled native conversation is conservatively blocked by the Bridge.
 // A new segment retains the saved scoped history without reusing that turn.
 const stops=await pool.query(`select count(*) count from ai_job_queue where ${ownSql} and body->'analysis_payload'->'chat'->>'conversationId'=$2 and status='failed'`,[owner,input.conversationId]);
 const pmaxScope=context.tests.some(test=>test.channel==='google-pmax');
 const body={...(input.attachments?.length?{attachments:input.attachments}:{}),mode:'question',dashboard_id:'bluevua-testing-chat',language:input.language==='zh'?'zh-CN':'en',period:{start:input.scope.period.start,end:input.scope.period.end},comparison:null,preset_label:input.scope.period.label,comparison_label:'Explicit selected scope only',question:`${prompt}\n\nUser question: ${input.question}`,latest_user_message:input.question,conversation:{project:'bluevua',kind:'ask',owner_key:digest(`testing-chat\0${user.sub}\0${input.conversationId}\0${stops.rows[0].count}${pmaxScope?`\0${PMAX_TESTING_BASIS}`:""}`),email:user.email},analysis_payload:{...context,generation_instructions:prompt,chat:{owner,conversationId:input.conversationId,scope:input.scope},historical_turns:previous.rows.reverse().filter(row=>row.answer&&(!pmaxScope||row.metric_basis?.pmax===PMAX_TESTING_BASIS)).map(row=>({...row,answer:row.answer.slice(0,6000)}))}};
 await enqueueAiJob(id,body);
 return (await testingChatJob(user,id))!;
}
export async function stopTestingChat(user:SiteUser,id:string,pending?:{scope:TestingChatScope;question:string;conversationId:string}){
 const client=await pool.connect();
 try{
  await client.query('begin');await client.query('select pg_advisory_xact_lock(72929001)');
  const rows=await client.query(`select * from ai_job_queue where ${ownSql} and id=$2 for update`,[testingChatOwner(user),id]);let job=rows.rows[0];
  if(!job&&pending){
   const body={mode:'question',dashboard_id:'bluevua-testing-chat',latest_user_message:pending.question,analysis_payload:{chat:{owner:testingChatOwner(user),conversationId:pending.conversationId,scope:pending.scope},entity_count:0,navigation_links:[]}};
   await client.query("insert into ai_job_queue(id,request_id,body,status,error,finalized) values($1,$2,$3::jsonb,'failed','user_cancelled',true) on conflict(id) do nothing",[id,randomUUID(),JSON.stringify(body)]);
   job=(await client.query('select * from ai_job_queue where id=$1 for update',[id])).rows[0];
  }
  if(!job){await client.query('rollback');return null;}
  if(job.status==='queued'||job.status==='running'){
   if(job.remote_id){
    const base=process.env.CODEX_BRIDGE_URL?.trim().replace(/\/$/,'');const key=process.env.CODEX_BRIDGE_API_KEY?.trim();
    if(!base||!key)throw Error('AI Bluevua cancellation is unavailable.');
    const response=await fetch(`${base}/v1/codex/jobs/${job.remote_id}/cancel`,{method:'POST',headers:{authorization:`Bearer ${key}`},signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error('AI Bluevua could not confirm cancellation.');
    const result=await response.json();
    if(result.status==='completed'){await client.query("update ai_job_queue set status='completed',result=$2::jsonb,updated_at=now() where id=$1",[id,JSON.stringify(result.result)]);}
    else if(result.status==='cancelled')await client.query("update ai_job_queue set status='failed',error='user_cancelled',updated_at=now() where id=$1",[id]);
    else throw Error('AI Bluevua has not confirmed cancellation yet.');
   }else{
    if(job.error)throw Error('Submission status is uncertain. Wait for the existing request to reconnect before stopping.');
    await client.query("update ai_job_queue set status='failed',error='user_cancelled',updated_at=now() where id=$1",[id]);
   }
  }
  await client.query('commit');return await testingChatJob(user,id);
 }catch(error){await client.query('rollback');throw error;}finally{client.release();}
}
