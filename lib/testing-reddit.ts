import "server-only";
import { readTestingDataSnapshot, initializeTestingDataSnapshot } from "@/lib/testing-data-cache";
import { validRedditSharedSnapshot } from "@/lib/testing-reddit-snapshot";
import { createRedditRequester } from "@/lib/reddit-api-request";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { resolveTestingPeriod, testingPeriodLabels } from "@/lib/testing-google";

import { redditContentTest, redditTestFormat, redditTestGroup, redditContentPeriod } from "@/lib/reddit-content-testing";

import { redditSinceStartPreset, redditSinceStartLabel, type RedditPeriodInput } from "@/lib/reddit-testing-period";

const API="https://ads-api.reddit.com/api/v3";const USER_AGENT="web:emw3-dashboard:1.0";
type Credentials={refresh_token:string;CLIENT_ID:string;CLIENT_SECRET:string;Ad_Account_ID:string};type ApiList<T>={data:T[]};type Campaign={id:string;name:string;objective:string;effective_status:string};type AdGroup={id:string;campaign_id:string;name:string;effective_status:string};type Ad={id:string;campaign_id:string;ad_group_id:string;name:string;post_id:string;post_url:string;effective_status:string};type Post={id:string;type:string;thumbnail_url?:string;post_url?:string;headline?:string;body?:string;content?:Array<{media_url?:string}>};
type RawMetric={campaign_id?:string;ad_group_id?:string;ad_id?:string;impressions?:number;clicks?:number;spend?:number;reach?:number;conversion_purchase_clicks?:number;conversion_purchase_views?:number;conversion_purchase_total_value?:number};
export type RedditMetrics={spend:number;impressions:number;clicks:number;reach:number;ctr:number|null;cpm:number|null;costPerThousandReach:number|null;orders:number;revenue:number;cpa:number|null;cvr:number|null;roas:number|null;cpc:number|null};
export type RedditAd=RedditMetrics&{adId:string;name:string;headline:string|null;body:string|null;contentType:"Image"|"Video"|"Message";thumbnailUrl:string|null;videoUrl:string|null;postUrl:string|null};
export type RedditGroup=RedditMetrics&{adGroupId:string;name:string;activeAds:RedditAd[]};
export type RedditCampaign=RedditMetrics&{campaignId:string;name:string;campaignStatus?:string;kind:"Awareness"|"Conversion";groups:RedditGroup[]};
export type RedditTestingData={period:{start:string;end:string};periodLabel:string;campaigns:RedditCampaign[]};
const sharedDaily=new WeakMap<RedditTestingData,import("./overview-daily-metrics").OverviewDailySource>();
let tokenCache:{value:string;expires:number}|null=null;
async function credentials(){return JSON.parse(await readFile(path.join(process.cwd(),"credentials/reddit.json"),"utf8")) as Credentials;}
let tokenRefresh:Promise<string>|null=null;
async function accessToken(){
  if(tokenCache&&tokenCache.expires>Date.now())return tokenCache.value;
  if(!tokenRefresh)tokenRefresh=refreshAccessToken().finally(()=>{tokenRefresh=null;});
  return tokenRefresh;
}
async function refreshAccessToken(){const c=await credentials();const response=await fetch("https://www.reddit.com/api/v1/access_token",{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${c.CLIENT_ID}:${c.CLIENT_SECRET}`).toString("base64")}`,"Content-Type":"application/x-www-form-urlencoded","User-Agent":USER_AGENT},body:new URLSearchParams({grant_type:"refresh_token",refresh_token:c.refresh_token}),cache:"no-store"});if(!response.ok)throw new Error(`Reddit OAuth failed (HTTP ${response.status}).`);const body=await response.json() as {access_token?:string;expires_in?:number};if(!body.access_token)throw new Error("Unable to refresh Reddit access token.");tokenCache={value:body.access_token,expires:Date.now()+Math.max(60,(body.expires_in??3600)-120)*1000};return body.access_token;}
const reddit=createRedditRequester({fetcher:async(endpoint,init)=>fetch(`${API}${endpoint}`,{...init,headers:{Authorization:`Bearer ${await accessToken()}`,"User-Agent":USER_AGENT,"Content-Type":"application/json",...(init.headers??{})},signal:AbortSignal.timeout(30000),next:{revalidate:3600}})});
// A separate requester has no successful-response cache from prior page reads.
// The no-cache header also bypasses Next's development HMR fetch cache.
function freshRedditRequester(){return createRedditRequester({fetcher:async(endpoint,init)=>fetch(`${API}${endpoint}`,{...init,headers:{Authorization:`Bearer ${await accessToken()}`,"User-Agent":USER_AGENT,"Content-Type":"application/json",...(init.headers??{}),"Cache-Control":"no-cache"},signal:AbortSignal.timeout(30000),cache:"no-store"})});}

const iso=(date:Date)=>date.toISOString().slice(0,10);const addDay=(value:string)=>{const date=new Date(`${value}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+1);return iso(date);};
function values(row:RawMetric={}):RedditMetrics{const spend=Number(row.spend??0)/1e6,impressions=Number(row.impressions??0),clicks=Number(row.clicks??0),reach=Number(row.reach??0),orders=Number(row.conversion_purchase_clicks??0)+Number(row.conversion_purchase_views??0),revenue=Number(row.conversion_purchase_total_value??0)/100;const ratio=(a:number,b:number)=>b>0?a/b:null;return {spend,impressions,clicks,reach,orders,revenue,ctr:ratio(clicks,impressions),cpm:ratio(spend*1000,impressions),costPerThousandReach:ratio(spend*1000,reach),cpa:ratio(spend,orders),cvr:ratio(orders,clicks),roas:ratio(revenue,spend),cpc:ratio(spend,clicks)};}
async function report(accountId:string,period:{start:string;end:string},breakdown:"CAMPAIGN_ID"|"AD_GROUP_ID"|"AD_ID",request:typeof reddit=reddit){
 const fields=["IMPRESSIONS","CLICKS","SPEND","REACH","CONVERSION_PURCHASE_CLICKS","CONVERSION_PURCHASE_VIEWS","CONVERSION_PURCHASE_TOTAL_VALUE"];
 const body=JSON.stringify({data:{starts_at:`${period.start}T00:00:00Z`,ends_at:`${addDay(period.end)}T00:00:00Z`,breakdowns:[breakdown],fields}});
 const rows:RawMetric[]=[],seen=new Set<string>();
 let endpoint:string|undefined=`/ad_accounts/${accountId}/reports`;
 do{
  if(seen.has(endpoint))throw Error("Repeated Reddit reporting page");
  seen.add(endpoint);
  const page:{data:{metrics:RawMetric[]};pagination?:{next_url?:string}}=await request(endpoint,{method:"POST",body});
  if(!Array.isArray(page.data?.metrics))throw Error("Invalid Reddit reporting response");
  rows.push(...page.data.metrics);
  const next=page.pagination?.next_url;endpoint=undefined;
  if(next){const url=new URL(next,API);if(url.origin!==new URL(API).origin||!url.pathname.startsWith("/api/v3/"))throw Error("Unexpected Reddit pagination origin");endpoint=url.pathname.replace("/api/v3","")+url.search;}
 }while(endpoint);
 return rows;
}
export async function getRedditTestingData(input:RedditPeriodInput={},contentTesting=false,request:typeof reddit=reddit):Promise<RedditTestingData>{await connection();const c=await credentials();const latest=iso(new Date(Date.now()-86400000));const preset=input.preset??(contentTesting?redditSinceStartPreset:"lastWeek"),period=preset===redditSinceStartPreset?redditContentPeriod():resolveTestingPeriod(latest,{...input,preset});const [campaignList,groupList,adList,campaignRows,groupRows,adRows]=await Promise.all([request<ApiList<Campaign>>(`/ad_accounts/${c.Ad_Account_ID}/campaigns`),request<ApiList<AdGroup>>(`/ad_accounts/${c.Ad_Account_ID}/ad_groups`),request<ApiList<Ad>>(`/ad_accounts/${c.Ad_Account_ID}/ads`),report(c.Ad_Account_ID,period,"CAMPAIGN_ID",request),report(c.Ad_Account_ID,period,"AD_GROUP_ID",request),report(c.Ad_Account_ID,period,"AD_ID",request)]);const campaignsRaw=campaignList.data.filter(item=>contentTesting?Boolean(redditContentTest(item.name,item.id)):item.effective_status==="ACTIVE"&&["IMPRESSIONS","CONVERSIONS"].includes(item.objective));const activeAds=adList.data.filter(item=>campaignsRaw.some(campaign=>campaign.id===item.campaign_id&&(contentTesting?Boolean(redditTestFormat(redditContentTest(campaign.name,campaign.id)?.name??campaign.name,item.name))&&groupList.data.some(group=>group.id===item.ad_group_id&&redditTestGroup(redditContentTest(campaign.name,campaign.id)?.name??campaign.name,group.name)):item.effective_status==="ACTIVE")));const postEntries=await Promise.all(activeAds.map(async ad=>{const result=await request<{data:Post}>(`/posts/${ad.post_id}`);return [ad.id,result.data] as const;}));const posts=new Map(postEntries);const adMetric=new Map(adRows.map(row=>[row.ad_id,row]));const groupMetric=new Map(groupRows.map(row=>[row.ad_group_id,row]));const campaignMetric=new Map(campaignRows.map(row=>[row.campaign_id,row]));const campaigns=campaignsRaw.map(campaign=>{const groups=groupList.data.filter(group=>group.campaign_id===campaign.id&&(contentTesting?redditTestGroup(redditContentTest(campaign.name,campaign.id)?.name??campaign.name,group.name):group.effective_status==="ACTIVE")).map(group=>{const ads=activeAds.filter(ad=>ad.ad_group_id===group.id).map(ad=>{const post=posts.get(ad.id);const type=contentTesting?redditTestFormat(redditContentTest(campaign.name,campaign.id)?.name??campaign.name,ad.name)!:post?.type==="VIDEO"?"Video" as const:post?.type==="TEXT"?"Message" as const:"Image" as const;return {adId:ad.id,name:ad.name,headline:post?.headline?.trim()||null,body:post?.body?.trim()||null,contentType:type,thumbnailUrl:post?.thumbnail_url??null,videoUrl:type==="Video"?post?.content?.[0]?.media_url??null:null,postUrl:post?.post_url??ad.post_url??null,...values(adMetric.get(ad.id))};}).sort((a,b)=>b.spend-a.spend);return {adGroupId:group.id,name:group.name,activeAds:ads,...values(groupMetric.get(group.id))};}).sort((a,b)=>b.spend-a.spend);return {campaignId:campaign.id,name:campaign.name,campaignStatus:campaign.effective_status,kind:contentTesting?redditContentTest(campaign.name,campaign.id)!.kind:campaign.objective==="IMPRESSIONS"?"Awareness" as const:"Conversion" as const,groups,...values(campaignMetric.get(campaign.id))};}).sort((a,b)=>a.kind.localeCompare(b.kind));return {period,periodLabel:preset===redditSinceStartPreset?redditSinceStartLabel:testingPeriodLabels[preset],campaigns};}

/** Force an upstream read without changing the last published snapshot. */
export async function fetchFreshRedditTestingData(input:RedditPeriodInput={}) {
 const request=freshRedditRequester();
 const data=await getRedditTestingData(input,true,request);
 const daily=await getRedditOverviewDaily(data,request);
 return {data,daily};
}

/** Content-testing scope used by Reddit, its ad-group details and Overview. */
export async function getRedditContentTestingData(input:RedditPeriodInput={}) {
 await connection();
 const preset=input.preset??redditSinceStartPreset;
 const latest=iso(new Date(Date.now()-86400000));
 const period=preset===redditSinceStartPreset?redditContentPeriod():resolveTestingPeriod(latest,{...input,preset});
 const label=preset===redditSinceStartPreset?redditSinceStartLabel:testingPeriodLabels[preset];
 try{
  const snapshot=await readTestingDataSnapshot("reddit",input)??await initializeTestingDataSnapshot("reddit",input,()=>fetchFreshRedditTestingData(input));
  if(snapshot&&validRedditSharedSnapshot(snapshot.payload,period,label)){sharedDaily.set(snapshot.payload.data,snapshot.payload.daily);return snapshot.payload.data;}
 }catch{/* A missing or unavailable shared cache retains the existing page path. */}
 return getRedditTestingData(input,true);
}

/** Stable account metadata, used only by the background analysis refresh. */
export async function getRedditTestingCurrency(){
 const c=await credentials();
 const result=await reddit<{data:{currency?:string;currency_code?:string}}>(`/ad_accounts/${c.Ad_Account_ID}`);
 return result.data.currency??result.data.currency_code??null;
}

/** Daily ad financials and campaign reach use the same two scopes as Overview. */
export async function getRedditOverviewDaily(data:RedditTestingData,request:typeof reddit=reddit):Promise<import('./overview-daily-metrics').OverviewDailySource>{
 const published=sharedDaily.get(data);if(published)return published;
 const c=await credentials();
 type Daily=RawMetric&{date:string};
 const read=async(breakdown:'AD_ID'|'CAMPAIGN_ID')=>{
  const rows:Daily[]=[];let endpoint:string|undefined=`/ad_accounts/${c.Ad_Account_ID}/reports`;const seen=new Set<string>();
  do{
   if(seen.has(endpoint))throw Error('Repeated Reddit daily page');seen.add(endpoint);
   const page:{data:{metrics:Daily[]};pagination?:{next_url?:string}}=await request<{data:{metrics:Daily[]};pagination?:{next_url?:string}}>(endpoint,{method:'POST',body:JSON.stringify({data:{starts_at:`${data.period.start}T00:00:00Z`,ends_at:`${addDay(data.period.end)}T00:00:00Z`,breakdowns:['DATE',breakdown],fields:['IMPRESSIONS','CLICKS','SPEND','REACH','CONVERSION_PURCHASE_CLICKS','CONVERSION_PURCHASE_VIEWS','CONVERSION_PURCHASE_TOTAL_VALUE']}})});
   rows.push(...page.data.metrics);
   const next:string|undefined=page.pagination?.next_url;endpoint=undefined;
   if(next){const url:URL=new URL(next,API);if(url.origin!==new URL(API).origin||!url.pathname.startsWith('/api/v3/'))throw Error('Unexpected Reddit pagination origin');endpoint=url.pathname.replace('/api/v3','')+url.search;}
  }while(endpoint);
  if(rows.some(row=>!/^\d{4}-\d{2}-\d{2}/.test(row.date)))throw Error('Invalid Reddit daily dates');
  return rows;
 };
 const [ads,campaigns]=await Promise.all([read('AD_ID'),read('CAMPAIGN_ID')]);
 const types=new Map(data.campaigns.flatMap(campaign=>campaign.groups.flatMap(group=>group.activeAds.map(ad=>[ad.adId,ad.contentType==='Image'?'Picture' as const:ad.contentType]))));
 const ids=new Set(data.campaigns.map(campaign=>campaign.campaignId));
 return {channel:'Reddit',rows:ads.filter(row=>types.has(row.ad_id!)).map(row=>({date:row.date.slice(0,10),entityId:row.ad_id!,assetType:types.get(row.ad_id!)!,...values(row)})),reach:campaigns.filter(row=>ids.has(row.campaign_id!)).map(row=>({date:row.date.slice(0,10),value:row.reach==null?null:Number(row.reach)}))};
}
