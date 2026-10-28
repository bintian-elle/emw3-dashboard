import "server-only";
import {cache} from "react";
import {mkdir,readFile,writeFile,rename} from "node:fs/promises";
import path from "node:path";
import {googleContentTestingInventory,fetchFreshGoogleContentInventory,type GoogleContentTestingInventory} from "@/lib/google-content-testing-scope";
import {readTestingDataSnapshot} from "@/lib/testing-data-cache";
import {parseGoogleAdsResponse} from "@/lib/google-ads-response";
import type {GoogleSearchTest} from "@/lib/testing-google";
import type {GoogleAdPerformanceArchive} from "@/lib/google-ad-performance";
import type {CreativeArchive} from "@/lib/google-creative-archive";

type Row={campaign:{id:string;name:string;status:string};adGroup:{id:string;name:string};adGroupAd:{ad:{id:string}};segments:{date:string};metrics:{costMicros?:string;conversions?:number;conversionsValue?:number;impressions?:string;clicks?:string}};
export type GoogleSearchPerformanceSnapshot={version:number;capturedAt:number;start:string;end:string;rows:Row[]};
type Snapshot=GoogleSearchPerformanceSnapshot;
export type GoogleSearchSharedSnapshot={version:1;inventory:GoogleContentTestingInventory;performance:GoogleSearchPerformanceSnapshot;assets:CreativeArchive["assets"]};
type ApiState={pending:Promise<Snapshot>|null;failedUntil:number;snapshot?:Snapshot};
declare global {var emw3GoogleTestingApiState:ApiState|undefined;}
const state=globalThis.emw3GoogleTestingApiState??={pending:null,failedUntil:0};
const campaigns="'EM-Search-Nonbrand-Purchase-Apr26','EM-Search-Nonbrand-TIS-April26','EM-Search-Nonbrand-Competitor-IS-Jun25'";
/** One shared daily query serves all three campaigns and their ad detail pages. */
export async function readGoogleTestingApiData():Promise<Snapshot>{
 const shared=await readGoogleSearchSharedSnapshot();if(shared)return shared.performance;
 if(state.pending)return state.pending;
 state.pending=load().finally(()=>{state.pending=null;});return state.pending;
}
async function load():Promise<Snapshot>{
 const today=new Date().toISOString().slice(0,10),start="2025-01-01";
 if(state.snapshot?.version===2&&state.snapshot.end>=today&&Date.now()-state.snapshot.capturedAt<6*3600000)return state.snapshot;
 const directory=process.env.GOOGLE_ADS_CREATIVE_DIR||path.join(process.cwd(),".state/google-creatives");
 const filename=path.join(directory,"testing-performance.json");
 try{const cached=JSON.parse(await readFile(filename,"utf8")) as Snapshot;if(cached.version===2&&cached.start<=start&&cached.end>=today&&Date.now()-cached.capturedAt<6*3600000){state.snapshot=cached;return cached;}}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
 if(Date.now()<state.failedUntil)throw Error("Google Ads data refresh is temporarily unavailable. Please retry shortly.");
 try{
 const query=`SELECT campaign.id,campaign.name,campaign.status,ad_group.id,ad_group.name,ad_group_ad.ad.id,segments.date,metrics.cost_micros,metrics.conversions,metrics.conversions_value,metrics.impressions,metrics.clicks FROM ad_group_ad WHERE campaign.name IN (${campaigns}) AND segments.date BETWEEN '${start}' AND '${today}' AND ad_group_ad.status IN ('ENABLED','PAUSED','REMOVED')`;
 const inventory=await googleContentTestingInventory();
 const rows=inventory.ads.length?await queryGoogleTestingApi<Row>(query+` AND ad_group_ad.labels CONTAINS ANY ('${inventory.labelResource}')`):[];
 const snapshot:Snapshot={version:2,capturedAt:Date.now(),start,end:today,rows};
 await mkdir(directory,{recursive:true,mode:0o700});const temporary=`${filename}.${process.pid}.tmp`;await writeFile(temporary,JSON.stringify(snapshot),{mode:0o600});await rename(temporary,filename);state.snapshot=snapshot;return snapshot;
 }catch(error){state.failedUntil=Date.now()+60000;throw error;}
}
/** Return only a complete published shared snapshot, preserving local fallback. */
export const readGoogleSearchSharedSnapshot=cache(async ():Promise<GoogleSearchSharedSnapshot|null>=>{
 const stored=await readTestingDataSnapshot("google-search",{});
 const value=stored?.payload as GoogleSearchSharedSnapshot|undefined;
 if(value?.version!==1||value.inventory?.version!==1||!Array.isArray(value.inventory.ads)||!value.inventory.labelResource||value.performance?.version!==2||!Array.isArray(value.performance.rows)||!value.performance.start||!value.performance.end||!Array.isArray(value.assets))return null;
 return value;
});
/** Build a complete new search snapshot in memory; publishing is the caller's atomic commit. */
export async function fetchFreshGoogleSearchSnapshot():Promise<GoogleSearchSharedSnapshot>{
 const inventory=await fetchFreshGoogleContentInventory();
 const today=new Date().toISOString().slice(0,10),start="2025-01-01";
 const query=`SELECT campaign.id,campaign.name,campaign.status,ad_group.id,ad_group.name,ad_group_ad.ad.id,segments.date,metrics.cost_micros,metrics.conversions,metrics.conversions_value,metrics.impressions,metrics.clicks FROM ad_group_ad WHERE campaign.name IN (${campaigns}) AND segments.date BETWEEN '${start}' AND '${today}' AND ad_group_ad.status IN ('ENABLED','PAUSED','REMOVED')`;
 const campaignIds=[...new Set(inventory.ads.map(ad=>ad.campaign.id))];
 if(campaignIds.some(id=>!/^\d+$/.test(id)))throw Error("Google Ads returned an invalid campaign identifier.");
 const assetFields="asset.id,asset.name,asset.type,asset.text_asset.text,asset.image_asset.full_size.url,asset.youtube_video_asset.youtube_video_id,asset.sitelink_asset.link_text,asset.sitelink_asset.description1,asset.sitelink_asset.description2,asset.final_urls,asset.callout_asset.callout_text";
 const [rows,assets]=await Promise.all([
  inventory.ads.length?queryGoogleTestingApi<Row>(query+` AND ad_group_ad.labels CONTAINS ANY ('${inventory.labelResource}')`):Promise.resolve([]),
  campaignIds.length?Promise.all((["campaign_asset","ad_group_asset"] as const).map(resource=>queryGoogleTestingApi<CreativeArchive["assets"][number]>(`SELECT campaign.id,${resource==="ad_group_asset"?"ad_group.id,":""}${resource}.field_type,${assetFields} FROM ${resource} WHERE campaign.id IN (${campaignIds.join(",")})`))).then(groups=>groups.flat()):Promise.resolve([]),
 ]);
 return {version:1,inventory,performance:{version:2,capturedAt:Date.now(),start,end:today,rows},assets};
}
export function apiGoogleSearchReport(data:Snapshot,campaignName:string,period:{start:string;end:string},periodLabel:string,knownGroups:Array<{id:string;name:string}>=[],testingStartDate?:string,allowedAdIds?:ReadonlySet<string>):GoogleSearchTest{
 const campaignRows=data.rows.filter(row=>row.campaign.name===campaignName&&(!allowedAdIds||allowedAdIds.has(row.adGroupAd.ad.id)));
 const inventory=new Map(knownGroups.map(group=>[group.id,group.name]));for(const row of campaignRows)inventory.set(row.adGroup.id,row.adGroup.name);
 const ratio=(a:number,b:number)=>b>0?a/b:null;
 const groups=[...inventory].map(([adGroupId,name])=>{
 const sum=campaignRows.filter(row=>row.adGroup.id===adGroupId&&row.segments.date>=period.start&&row.segments.date<=period.end).reduce((total,row)=>({spend:total.spend+Number(row.metrics.costMicros||0)/1e6,revenue:total.revenue+Number(row.metrics.conversionsValue||0),orders:total.orders+Number(row.metrics.conversions||0),impressions:total.impressions+Number(row.metrics.impressions||0),clicks:total.clicks+Number(row.metrics.clicks||0)}),{spend:0,revenue:0,orders:0,impressions:0,clicks:0});
 return {label:"" as const,name,adGroupId,...sum,cpa:ratio(sum.spend,sum.orders),cvr:ratio(sum.orders,sum.clicks),roas:ratio(sum.revenue,sum.spend),ctr:ratio(sum.clicks,sum.impressions),cpc:ratio(sum.spend,sum.clicks)};
 }).sort((a,b)=>a.name.localeCompare(b.name));
 return {campaignName,campaignStatus:campaignRows[0]?.campaign.status??"Unknown",testingStartDate:testingStartDate??campaignRows.map(row=>row.segments.date).sort()[0],period,periodLabel,groups};
}
export function apiGoogleAdArchive(data:Snapshot):GoogleAdPerformanceArchive{return {version:1,range:{start:data.start,end:data.end},days:data.rows.map(row=>({groupId:row.adGroup.id,adId:row.adGroupAd.ad.id,date:row.segments.date,spend:Number(row.metrics.costMicros||0)/1e6,revenue:Number(row.metrics.conversionsValue||0),orders:Number(row.metrics.conversions||0),impressions:Number(row.metrics.impressions||0),clicks:Number(row.metrics.clicks||0)}))};}

export async function queryGoogleTestingApi<T>(query:string):Promise<T[]>{
 const env=process.env;
 if(!env.GOOGLE_ADS_CLIENT_ID||!env.GOOGLE_ADS_SECRET||!env.GOOGLE_ADS_TOKEN)throw Error("Google Ads OAuth configuration is incomplete");
 const oauth=await fetch("https://oauth2.googleapis.com/token",{method:"POST",body:new URLSearchParams({client_id:env.GOOGLE_ADS_CLIENT_ID,client_secret:env.GOOGLE_ADS_SECRET,refresh_token:env.GOOGLE_ADS_TOKEN,grant_type:"refresh_token"}),signal:AbortSignal.timeout(30000),cache:"no-store"});
 const token=await oauth.json();if(!oauth.ok||!token.access_token)throw Error(`Google Ads OAuth failed (${oauth.status})`);
 const customer=(env.GOOGLE_ADS_CUSTOMER_ID||"").replaceAll("-","");if(!/^\d+$/.test(customer))throw Error("Invalid Google Ads customer ID");
 const headers:Record<string,string>={Authorization:`Bearer ${token.access_token}`,"Content-Type":"application/json","Cache-Control":"no-cache"};if(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID)headers["login-customer-id"]=env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replaceAll("-","");
 const response=await fetch(`https://googleads.googleapis.com/v24/customers/${customer}/googleAds:searchStream`,{method:"POST",headers,body:JSON.stringify({query}),signal:AbortSignal.timeout(60000),cache:"no-store"});
 if(!response.ok)throw Error(`Google Ads reporting failed (HTTP ${response.status})`);
 return parseGoogleAdsResponse<T>(await response.json());
}
