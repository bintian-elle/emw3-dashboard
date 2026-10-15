import "server-only";
import {mkdir,readFile,writeFile,rename} from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {singleBucketUniqueRecipients} from "@/lib/edm-reach-metrics";

declare global{var emw3EdmReachRequests:Map<string,Promise<number|null>>|undefined;}
const pending=globalThis.emw3EdmReachRequests??=new Map();
export async function edmUniqueRecipients(period:{start:string;end:string},campaignIds:string[]):Promise<number|null>{
 if(!campaignIds.length)return 0;
 const ids=[...new Set(campaignIds)].sort();
 const key=createHash("sha256").update(JSON.stringify([period,ids])).digest("hex");
 const existing=pending.get(key);if(existing)return existing;
 const promise=load(period,ids,key).catch(error=>{console.warn("EDM recipient reach unavailable:",error instanceof Error?error.message:"Reporting failed");return null;}).finally(()=>{setTimeout(()=>pending.delete(key),60000).unref();});
 pending.set(key,promise);return promise;
}
async function load(period:{start:string;end:string},ids:string[],key:string){
 const directory=path.join(process.cwd(),".state/edm-reach"),file=path.join(directory,`${key}.json`);
 try{const cached=JSON.parse(await readFile(file,"utf8"));if(Date.now()-cached.capturedAt<6*3600000)return cached.uniqueRecipients as number|null;}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
 if(!process.env.KLAVIYO_API_KEY)throw Error("Klaviyo API configuration is missing");
 const headers={Authorization:`Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`,revision:process.env.KLAVIYO_REVISION||"2026-07-15",accept:"application/json","Content-Type":"application/json"};
 const metricFile=path.join(directory,"metric.json");let metricId:string|undefined;
 try{metricId=JSON.parse(await readFile(metricFile,"utf8")).id;}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
 if(!metricId){
 let url:string|null="https://a.klaviyo.com/api/metrics/";
 for(let page=0;url&&page<10;page++){
 const response:Response=await fetch(url,{headers,signal:AbortSignal.timeout(20000),cache:"no-store"});if(!response.ok)throw Error(`Klaviyo metric lookup failed (${response.status})`);
 const body:{data?:Array<{id:string;attributes:{name:string}}>;links?:{next?:string|null}}=await response.json();metricId=body.data?.find((row:{id:string;attributes:{name:string}})=>row.attributes.name==="Received Email")?.id;if(metricId)break;url=body.links?.next??null;
 }
 if(!metricId)throw Error("Received Email metric is unavailable");
 await mkdir(directory,{recursive:true,mode:0o700});await writeFile(metricFile,JSON.stringify({id:metricId}),{mode:0o600});
 }
 const end=new Date(`${period.end}T12:00:00Z`);end.setUTCDate(end.getUTCDate()+1);
 const response=await fetch("https://a.klaviyo.com/api/metric-aggregates/",{method:"POST",headers,body:JSON.stringify({data:{type:"metric-aggregate",attributes:{metric_id:metricId,measurements:["unique"],interval:"month",by:[],filter:[`greater-or-equal(datetime,${period.start}T00:00:00Z)`,`less-than(datetime,${end.toISOString().slice(0,10)}T00:00:00Z)`,`any($message,${JSON.stringify(ids)})`],timezone:"UTC"}}}),signal:AbortSignal.timeout(30000),cache:"no-store"});
 if(!response.ok)throw Error(`Klaviyo recipient reach failed (${response.status})`);
 const body=await response.json();const data=body.data?.attributes?.data;
 if(!Array.isArray(data))throw Error("Invalid Klaviyo recipient report");
 const uniqueRecipients=singleBucketUniqueRecipients(data.flatMap((row:{measurements?:{unique?:number[]}})=>row.measurements?.unique??[]));
 // Multiple month buckets cannot be summed into an exact period-wide unique total.
 await mkdir(directory,{recursive:true,mode:0o700});const temporary=`${file}.${process.pid}.tmp`;await writeFile(temporary,JSON.stringify({capturedAt:Date.now(),uniqueRecipients}),{mode:0o600});await rename(temporary,file);return uniqueRecipients;
}
