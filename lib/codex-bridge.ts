import "server-only";
import { randomUUID } from "node:crypto";
import { enqueueAiJob, readAiJob } from "@/lib/ai-job-queue";
import type { DashboardRequest } from "@/lib/klaviyo-dashboard";

import type { SiteUser } from "@/lib/site-auth";
import { askConversation, persistentConversationsEnabled } from "@/lib/ai-conversation";

type BridgeMode="insights"|"question"|"suggested_questions";
type BridgeStatus="queued"|"running"|"completed"|"failed"|"cancelled";
type BridgeError={type?:string;code?:string};
export type BridgeProgress={stage:string;status:BridgeStatus;jobId:string;message?:string};
type BridgeEnvelope<T>={job_id:string;request_id:string;mode:BridgeMode;status:BridgeStatus;result:T|null;error:BridgeError|null;progress?:{stage?:string;message?:string}|null};
type InsightResult={headline:string;executive_summary:string;performance_status:string;key_insights:unknown[];recommended_actions:unknown[]};
type QuestionResult={answer_markdown:string};
type SuggestedQuestionsResult={questions:string[]};
export type BridgeAttachment={kind:"image"|"text";name:string;mime_type:string;data?:string;text?:string};

export class CodexBridgeError extends Error{
 constructor(message:string,public code="bridge_error"){super(message);this.name="CodexBridgeError"}
}
export class AiJobPending extends Error{
 constructor(public status:string){super('AI analysis is queued or running.');}
}

const wait=(milliseconds:number,signal?:AbortSignal)=>new Promise<void>((resolve,reject)=>{
 const onAbort=()=>{clearTimeout(timer);reject(new DOMException("The operation was aborted.","AbortError"))};
 const timer=setTimeout(()=>{signal?.removeEventListener("abort",onAbort);resolve()},milliseconds);
 if(signal){if(signal.aborted)return onAbort();signal.addEventListener("abort",onAbort,{once:true})}
});

function configuration(){
 const baseUrl=process.env.CODEX_BRIDGE_URL?.trim().replace(/\/$/,"");
 const apiKey=process.env.CODEX_BRIDGE_API_KEY?.trim();
 if(!baseUrl||!apiKey)throw new CodexBridgeError("Codex Bridge is not configured on the server.","bridge_not_configured");
 return{baseUrl,apiKey};
}


async function runJob<T>(body:Record<string,unknown>,signal?:AbortSignal,onProgress?:(progress:BridgeProgress)=>void):Promise<{jobId:string;result:T}>{
 configuration();
 let job=await enqueueAiJob(String(body.request_id),body);
 while(job.status==='queued'||job.status==='running'){
  onProgress?.({stage:job.status,status:job.status,jobId:job.id});
  await wait(5000,signal);
  job=await readAiJob(job.id);
 }
 if(job.status!=='completed'||!job.result)throw new CodexBridgeError('The remote AI task failed. Please retry.','job_failed');
 return{jobId:job.remote_id!,result:job.result as T};
}

function common(input:DashboardRequest,analysisPayload:Record<string,unknown>){return{
 language:input.language==="zh"?"zh-CN":"en",
 period:input.range,
 comparison:input.comparison,
 preset_label:input.presetLabel,
 comparison_label:input.comparisonLabel,
 analysis_payload:analysisPayload,
}}

export async function generateCodexInsights(input:DashboardRequest,analysisPayload:Record<string,unknown>,signal?:AbortSignal){
 configuration();
 const id=`summary:${input.language||'en'}:${input.range.start}:${input.range.end}:${input.comparison.start}:${input.comparison.end}`;
 const insights=await enqueueAiJob(id,{mode:'insights',...common(input,analysisPayload),...(persistentConversationsEnabled()?{conversation:{project:'bluevua',kind:'insights'}}:{})});
 if(insights.status==='failed')throw new CodexBridgeError('The insight generation failed. Please contact the administrator.','job_failed');
 if(insights.status!=='completed')throw new AiJobPending(insights.status);
 // Reuse the exact persisted snapshot required by the Bridge dependency contract.
 const suggestions=await enqueueAiJob(`${id}:questions`,{...insights.body,mode:'suggested_questions',insight_job_id:insights.remote_id});
 if(suggestions.status==='failed')throw new CodexBridgeError('Suggested question generation failed. Please contact the administrator.','job_failed');
 if(suggestions.status!=='completed')throw new AiJobPending(suggestions.status);
 const result=suggestions.result as SuggestedQuestionsResult;
 if(!Array.isArray(result?.questions)||result.questions.length!==5)throw new CodexBridgeError('The AI returned invalid suggested questions.','suggested_questions_invalid');
 return{result:{...(insights.result as InsightResult),suggested_questions:result.questions},jobId:insights.remote_id!,model:'codex-bridge'};
}

export async function askCodex(input:DashboardRequest,analysisPayload:Record<string,unknown>,question:string,signal?:AbortSignal,onProgress?:(progress:BridgeProgress)=>void,attachments:BridgeAttachment[]=[],latestUserMessage=question,user?:SiteUser){
 // Enable only after the Bridge memory protocol is deployed. Never derive
 // confirmation commands from the history-wrapped prompt or attachments.
 const memoryInput=process.env.CODEX_BRIDGE_TEAM_MEMORY_ENABLED==="true"?{latest_user_message:latestUserMessage}:{};
 const persistent=persistentConversationsEnabled();
 if(persistent&&!user)throw new CodexBridgeError("Sign in before asking a question.","identity_required");
 const job=await runJob<QuestionResult>({request_id:randomUUID(),mode:"question",...common(input,analysisPayload),question,...memoryInput,...(persistent?{conversation:askConversation(user!),latest_user_message:latestUserMessage}:{}),...(attachments.length?{attachments}: {})},signal,onProgress);
 const answer=job.result.answer_markdown?.trim();
 if(!answer)throw new CodexBridgeError("The AI returned an empty response. Please retry.","empty_answer");
 return{answer,jobId:job.jobId,model:"codex-bridge"};
}

export async function conversationHistory(user:SiteUser){
 if(!persistentConversationsEnabled())return{title:null,turns:[]};
 const{baseUrl,apiKey}=configuration();
 const response=await fetch(`${baseUrl}/v1/codex/conversations/history`,{method:"POST",headers:{authorization:`Bearer ${apiKey}`,"content-type":"application/json"},body:JSON.stringify(askConversation(user)),cache:"no-store",signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new CodexBridgeError("Conversation history is unavailable.","history_unavailable");
 return response.json();
}
