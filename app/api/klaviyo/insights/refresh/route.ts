import { clearAiInsightPreset, type DashboardRequest, type DateRange } from "@/lib/klaviyo-dashboard";
import { ACCESS_COOKIE, accessToken } from "@/lib/site-auth";

const iso=(date:Date)=>date.toISOString().slice(0,10);
function shift(value:string,days:number){const date=new Date(`${value}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return iso(date)}
function easternToday(){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));return`${values.year}-${values.month}-${values.day}`}
function previous(range:DateRange){const days=Math.round((Date.parse(`${range.end}T00:00:00Z`)-Date.parse(`${range.start}T00:00:00Z`))/86_400_000)+1;return{start:shift(range.start,-days),end:shift(range.end,-days)}}
type InsightLanguage="en"|"zh";
function requestFor(presetLabel:string,range:DateRange,language:InsightLanguage):DashboardRequest&{mode:"summary"}{return{mode:"summary",language,range,comparison:previous(range),presetLabel,comparisonLabel:"Previous period"}}
const retryable=(status:number,message:string)=>status===408||status===429||status>=500||/model|provider|capacity|rate.?limit|temporar|unavailable/i.test(message);
const wait=(milliseconds:number)=>new Promise(resolve=>setTimeout(resolve,milliseconds));

export async function GET(request:Request){
 const secret=process.env.CRON_SECRET?.trim();
 if(!secret)return Response.json({error:"CRON_SECRET is not configured."},{status:503});
 if(request.headers.get("authorization")!==`Bearer ${secret}`)return Response.json({error:"Unauthorized"},{status:401});
 const siteSecret=process.env.SITE_ACCESS_KEY?.trim();
 if(!siteSecret)return Response.json({error:"SITE_ACCESS_KEY is not configured."},{status:503});
 const internalCookie=`${ACCESS_COOKIE}=${await accessToken(siteSecret)}`;
 const today=easternToday();
 const weekday=(new Date(`${today}T00:00:00Z`).getUTCDay()+6)%7,lastWeekEnd=shift(today,-weekday),lastWeek={start:shift(lastWeekEnd,-6),end:lastWeekEnd};
 await clearAiInsightPreset("last_30_days");
 await clearAiInsightPreset("last_week",lastWeek.end);
 const endpoint=new URL("/api/klaviyo/ask",request.url);
 const generate=async(input:DashboardRequest&{mode:"summary"})=>{let lastError="Insight refresh failed.";for(let attempt=1;attempt<=3;attempt++){try{const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json",cookie:internalCookie},body:JSON.stringify(input),cache:"no-store"});const payload=await response.json();if(response.ok)return{preset:input.presetLabel,language:input.language,cached:Boolean(payload.cached),generatedAt:payload.generatedAt||new Date().toISOString(),attempt};lastError=payload.error||`Insight refresh failed (${response.status}).`;if(!retryable(response.status,lastError))break}catch(error){lastError=error instanceof Error?error.message:"Insight refresh failed."}if(attempt<3)await wait(attempt*1_500)}throw new Error(`${input.language}: ${lastError}`)};
 try{const results=[];for(const language of ["en","zh"] as const)results.push(await generate(requestFor("Last Week (Tue–Mon)",lastWeek,language)));return Response.json({ok:true,timezone:"America/New_York",today,results})}catch(error){return Response.json({ok:false,error:error instanceof Error?error.message:"Insight refresh failed."},{status:500})}
}
