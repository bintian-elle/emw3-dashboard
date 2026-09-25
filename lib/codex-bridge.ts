import "server-only";
import { randomUUID } from "node:crypto";
import type { DashboardRequest } from "@/lib/klaviyo-dashboard";

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

function errorMessage(envelope:BridgeEnvelope<unknown>){
 const code=envelope.error?.code||envelope.status;
 if(envelope.status==="cancelled")return new CodexBridgeError("The AI request was cancelled.",code);
 if(envelope.error?.type==="validation")return new CodexBridgeError("The AI returned an invalid response. Please retry.",code);
 if(envelope.error?.type==="timeout")return new CodexBridgeError("The AI request timed out. Please retry.",code);
 return new CodexBridgeError("The remote AI service could not complete the request. Please retry.",code);
}

async function bridgeFetch<T>(path:string,init:RequestInit,signal?:AbortSignal){
 const{baseUrl,apiKey}=configuration();
 let response:Response;
 try{response=await fetch(`${baseUrl}${path}`,{...init,headers:{authorization:`Bearer ${apiKey}`,...init.headers},cache:"no-store",signal})}
 catch(error){if(error instanceof Error&&error.name==="AbortError")throw error;throw new CodexBridgeError("The remote AI service is unavailable. Please retry.","bridge_network_error")}
 const payload=await response.json().catch(()=>null);
 if(!response.ok){const code=payload?.error?.code||`http_${response.status}`;throw new CodexBridgeError(response.status===429?"The AI service is busy. Please retry shortly.":"The remote AI service rejected the request. Please retry.",code)}
 return payload as T;
}

async function runJob<T>(body:Record<string,unknown>,signal?:AbortSignal,onProgress?:(progress:BridgeProgress)=>void):Promise<{jobId:string;result:T}>{
 const accepted=await bridgeFetch<BridgeEnvelope<T>>("/v1/codex/jobs",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)},signal);
 const report=(job:BridgeEnvelope<T>)=>onProgress?.({stage:job.progress?.stage||job.status,status:job.status,jobId:job.job_id,message:job.progress?.message});
 let job=accepted;
 let progressKey="";
 const reportChange=()=>{const key=`${job.status}:${job.progress?.stage||""}:${job.progress?.message||""}`;if(key!==progressKey){progressKey=key;report(job)}};
 reportChange();
 const deadline=Date.now()+190_000;
 while(job.status==="queued"||job.status==="running"){
  if(Date.now()>=deadline)throw new CodexBridgeError("The AI request timed out. Please retry.","client_poll_timeout");
  await wait(2_000,signal);
  job=await bridgeFetch<BridgeEnvelope<T>>(`/v1/codex/jobs/${accepted.job_id}`,{method:"GET"},signal);
  reportChange();
 }
 if(job.status!=="completed"||!job.result)throw errorMessage(job);
 return{jobId:job.job_id,result:job.result};
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
 const shared=common(input,analysisPayload);
 const insights=await runJob<InsightResult>({request_id:randomUUID(),mode:"insights",...shared},signal);
 const suggestions=await runJob<SuggestedQuestionsResult>({request_id:randomUUID(),mode:"suggested_questions",...shared,insight_job_id:insights.jobId},signal);
 if(!Array.isArray(suggestions.result.questions)||suggestions.result.questions.length!==5)throw new CodexBridgeError("The AI returned an invalid set of suggested questions. Please retry.","suggested_questions_invalid");
 return{result:{...insights.result,suggested_questions:suggestions.result.questions},jobId:insights.jobId,model:"codex-bridge"};
}

export async function askCodex(input:DashboardRequest,analysisPayload:Record<string,unknown>,question:string,signal?:AbortSignal,onProgress?:(progress:BridgeProgress)=>void,attachments:BridgeAttachment[]=[]){
 const job=await runJob<QuestionResult>({request_id:randomUUID(),mode:"question",...common(input,analysisPayload),question,...(attachments.length?{attachments}: {})},signal,onProgress);
 const answer=job.result.answer_markdown?.trim();
 if(!answer)throw new CodexBridgeError("The AI returned an empty response. Please retry.","empty_answer");
 return{answer,jobId:job.jobId,model:"codex-bridge"};
}
