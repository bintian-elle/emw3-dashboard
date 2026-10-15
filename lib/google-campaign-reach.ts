import "server-only";
import {mkdir,readFile,writeFile,rename} from "node:fs/promises";
import path from "node:path";
import {queryGoogleTestingApi} from "@/lib/google-testing-api";

import {googleReachValues,type GoogleReachRow} from "@/lib/google-reach-metrics";
type CachedReach={capturedAt:number;values:Record<string,number|null>};
declare global {var emw3GoogleReachRequests:Map<string,Promise<Record<string,number|null>>>|undefined;}
const requests=globalThis.emw3GoogleReachRequests??=new Map();
const names=["EM-Search-Nonbrand-Purchase-Apr26","EM-Search-Nonbrand-TIS-April26","EM-Search-Nonbrand-Competitor-IS-Jun25","EM-Search-Brand-Mar25","EM-Search-Brand-Mar25 Brand_AbsTopPageTest_2026/07"];
/** Query the whole reporting period: daily unique users cannot be added together. */
export async function googleCampaignReach(period:{start:string;end:string}):Promise<Record<string,number|null>>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(period.start)||!/^\d{4}-\d{2}-\d{2}$/.test(period.end)||period.start>period.end)throw Error("Invalid reach period");
 const key=`${period.start}_${period.end}`;
 const existing=requests.get(key);if(existing)return existing;
 const request=load(period,key).catch(error=>{console.warn("Google campaign reach unavailable:",error instanceof Error?error.message:"Unknown reporting error");return Object.fromEntries(names.map(name=>[name,null]));}).finally(()=>{
   // Keep both failures and completed reads briefly to avoid API bursts.
   setTimeout(()=>requests.delete(key),60000).unref();
 });requests.set(key,request);return request;
}
async function load(period:{start:string;end:string},key:string){
 const directory=path.join(process.env.GOOGLE_ADS_CREATIVE_DIR||path.join(process.cwd(),".state/google-creatives"),"reach");
 const filename=path.join(directory,`${key}.json`);
 try{const cached=JSON.parse(await readFile(filename,"utf8")) as CachedReach;if(Date.now()-cached.capturedAt<6*3600000)return cached.values;}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
 const rows=await queryGoogleTestingApi<GoogleReachRow>(`SELECT campaign.name,metrics.unique_users FROM campaign WHERE campaign.name IN (${names.map(name=>`'${name}'`).join(",")}) AND segments.date BETWEEN '${period.start}' AND '${period.end}'`);
 const values=googleReachValues(names,rows);
 await mkdir(directory,{recursive:true,mode:0o700});const temporary=`${filename}.${process.pid}.tmp`;await writeFile(temporary,JSON.stringify({capturedAt:Date.now(),values}),{mode:0o600});await rename(temporary,filename);return values;
}
