import { NextResponse } from "next/server";
import { existingInsightContext } from '@/lib/ai-job-queue';
import { cachedAiInsight, loadAiDetails, loadDashboard, saveBilingualAiInsight, updateCachedAiInsight, type DashboardRequest } from "@/lib/klaviyo-dashboard";
import { buildPerformanceIntelligence, parseAiInsightResponse, validateAiInsightClaims } from "@/lib/klaviyo-analytics";
import { askCodex, AiJobPending, CodexBridgeError, generateEdmCodexInsights } from "@/lib/codex-bridge";

import { currentSiteUser } from "@/lib/current-site-user";

type AskRequest=DashboardRequest&{question?:string;mode?:"question"|"summary";debug?:boolean};

function valid(range:DashboardRequest["range"]){const start=Date.parse(`${range?.start}T00:00:00Z`),end=Date.parse(`${range?.end}T00:00:00Z`);return Number.isFinite(start)&&Number.isFinite(end)&&end>=start&&(end-start)/86_400_000<365}

export async function POST(request:Request){
 try{
  const input=await request.json() as AskRequest;
  const mode=input.mode==="summary"?"summary":"question";
  const user=mode==="question"?await currentSiteUser():null;
  if(mode==="question"&&!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  input.language=input.language==="zh"?"zh":"en";
  const question=String(input.question||"").trim();
  if(mode==="question"&&(!question||question.length>500))return NextResponse.json({error:"Enter a question of no more than 500 characters."},{status:400});
  if(!valid(input.range)||!valid(input.comparison))return NextResponse.json({error:"Select a valid date range of no more than 365 days."},{status:400});
  if(mode==="summary"&&!input.debug){const cached=await cachedAiInsight(input);if(cached){const normalized=parseAiInsightResponse(JSON.stringify(cached.insights));if(normalized){if(!Array.isArray((cached.insights as Partial<typeof normalized>).suggested_questions)||(cached.insights as Partial<typeof normalized>).suggested_questions?.length!==5)await updateCachedAiInsight(input,normalized);return NextResponse.json({...cached,insights:normalized,cached:true})}}}

  const persisted=mode==='summary'?await existingInsightContext(input):undefined;
  const loaded=persisted?null:await Promise.all([loadDashboard(input),loadAiDetails(input)]);
  const context=persisted||(buildPerformanceIntelligence(loaded![0],loaded![1]) as Record<string,unknown>);
  const dataUpdatedThrough=loaded?.[0].dataUpdatedThrough;
  if(mode==="question"){
   const result=await askCodex(input,context,question,request.signal,undefined,[],question,user!);
   return NextResponse.json({...result,dataUpdatedThrough});
  }

  const generated=await generateEdmCodexInsights(input,context,request.signal);
  const en=parseAiInsightResponse(JSON.stringify(generated.translations.en));
  const zh=parseAiInsightResponse(JSON.stringify(generated.translations.zh));
  if(!en||!zh)return NextResponse.json({error:"The AI response failed JSON/schema validation.",cached:false},{status:502});
  const insights=input.language==='zh'?zh:en;
  const validationWarnings=validateAiInsightClaims(insights,context);
  if(validationWarnings.length&&process.env.NODE_ENV!=="production")console.warn("[api/klaviyo/ask] Fact validation warnings",{validationWarnings,model:generated.model,jobId:generated.jobId});
  await saveBilingualAiInsight(input,{en,zh},generated.model);
  const debug=input.debug&&process.env.NODE_ENV!=="production"?{fact_guardrails:(context as {fact_guardrails?:unknown}).fact_guardrails,validation_warnings:validationWarnings,final_json:insights,bridge_job_id:generated.jobId}:undefined;
  return NextResponse.json({insights,model:generated.model,dataUpdatedThrough,cached:false,validationWarnings,debug});
 }catch(error){
  if(error instanceof AiJobPending)return NextResponse.json({status:error.status,pending:true},{status:202,headers:{'Retry-After':'5','Cache-Control':'no-store'}});
  if(error instanceof CodexBridgeError){console.warn("[api/klaviyo/ask] Codex Bridge failed",{code:error.code});return NextResponse.json({error:error.message,cached:false},{status:502})}
  const message=error instanceof Error?(error.name==="AbortError"?"The AI request was cancelled.":error.message):"The AI analysis could not be completed.";
  return NextResponse.json({error:message},{status:500});
 }
}
