import "server-only";
import {metaTestingAdInventory,META_TESTING_BASIS} from "@/lib/meta-testing-ad-scope";
import { resolveMetaCreativeLinks,isOptionalMetaLinkPermissionError } from "@/lib/meta-creative-links";
import { readTestingDataSnapshot, initializeTestingDataSnapshot } from "@/lib/testing-data-cache";
import {isMetaVideo,type MetaCreative} from "@/lib/meta-creative-type";
import { connection } from "next/server";
import { resolveTestingPeriod, testingPeriodLabels, type TestingPeriodInput } from "@/lib/testing-google";
import type { OverviewDailySource } from "./overview-daily-metrics";

const META_API_VERSION="v25.0";
const META_CAMPAIGN_IDS=["120251709189500383"] as const;
type MetaAction={action_type:string;value:string};
type MetaInsightRow={ad_id?:string;ad_name?:string;adset_id:string;adset_name:string;reach?:string;spend?:string;impressions?:string;clicks?:string;inline_link_clicks?:string;actions?:MetaAction[];action_values?:MetaAction[]};
type MetaAdRow={id:string;name:string;adset_id:string;configured_status?:string;effective_status?:string;creative?:MetaCreative&{body?:string;title?:string}};
type MetaCampaignRow={id:string;name:string;status:string;effective_status:string};
export type MetaActiveAd={status?:string;effectiveStatus?:string;linkClicks?:number|null;linkCtr?:number|null;adId:string;name:string;postUrl?:string|null;previewUrl?:string|null;mediaType:"Image"|"Video";thumbnailUrl:string|null;videoUrl:string|null;spend:number;revenue:number;orders:number;impressions:number;clicks:number;cpa:number|null;cvr:number|null;roas:number|null;ctr:number|null;cpc:number|null;cpm:number|null;hookRate:number|null;reach:number|null;costPerReach:number|null;creativeContent?:MetaCreative&{body?:string;title?:string}};
export type MetaAdGroupMetric={campaignName:string;adGroupId:string;name:string;activeAds:MetaActiveAd[];spend:number;revenue:number;orders:number;impressions:number;clicks:number;cpa:number|null;cvr:number|null;roas:number|null;ctr:number|null;cpc:number|null;cpm:number|null;hookRate:number|null;reach:number|null;costPerReach:number|null};
export type MetaCampaign={campaignId:string;campaignName:string;campaignStatus:string;effectiveStatus:string;adGroups:MetaAdGroupMetric[];totals:{spend:number;revenue:number;orders:number;clicks:number;impressions:number;reach:number|null;costPerReach:number|null};metrics:ReturnType<typeof performance>} ;
export type MetaCampaignTest={periodLabel:string;period:{start:string;end:string};campaigns:MetaCampaign[];adGroups:MetaAdGroupMetric[];totals:{spend:number;revenue:number;orders:number;clicks:number;impressions:number;reach:number|null;costPerReach:number|null}};
export type MetaTestingSnapshot={metricBasis?:string;data:MetaCampaignTest;daily:OverviewDailySource;history?:Awaited<ReturnType<typeof metaTestingHistory>>;currency?:string};
const snapshotDaily=new WeakMap<MetaCampaignTest,OverviewDailySource>();

function token(){const value=process.env.META_ACCESS_TOKEN;if(!value)throw new Error("Meta credentials are not configured.");return value;}
async function graph<T>(path:string,params:Record<string,string>,fresh=false):Promise<T>{const query=new URLSearchParams({...params,access_token:token()});const response=await fetch(`https://graph.facebook.com/${META_API_VERSION}/${path}?${query}`,fresh?{cache:"no-store",headers:{"Cache-Control":"no-cache"}}:{next:{revalidate:86400}});if(!response.ok){const body=await response.text();let code:number|undefined;try{code=JSON.parse(body)?.error?.code;}catch{/* Non-JSON errors remain generic. */}if(response.status===429||(code!=null&&[4,17,32,613].includes(code)))throw new Error("Meta API rate limit (HTTP 429). Please try again later.");throw new Error(`Meta API request failed for ${path} (${response.status}): ${body.slice(0,300)}`);}return response.json() as Promise<T>;}
type MetaGraph = <T>(path:string,params:Record<string,string>)=>Promise<T>;
async function graphCollection<T>(read:MetaGraph,path:string,params:Record<string,string>):Promise<{data:T[]}>{
 const rows:T[]=[];const seen=new Set<string>();let after:string|undefined;
 do{
  const page=await read<{data:T[];paging?:{next?:string;cursors?:{after?:string}}}>(path,{...params,...(after?{after}:{})});
  rows.push(...page.data);
  const next=page.paging?.next?page.paging.cursors?.after:undefined;
  if(page.paging?.next&&(!next||seen.has(next)))throw Error("Incomplete Meta report");
  if(next)seen.add(next);after=next;
 }while(after);
 return {data:rows};
}
const number=(value?:string)=>Number(value??0);
const ratio=(a:number,b:number)=>b>0?a/b:null;
const actionValue=(actions:MetaAction[]|undefined,type:string)=>number(actions?.find(action=>action.action_type===type)?.value);
function performance(row:MetaInsightRow){const spend=number(row.spend),revenue=actionValue(row.action_values,"omni_purchase"),orders=actionValue(row.actions,"omni_purchase"),impressions=number(row.impressions),clicks=number(row.clicks),videoViews=actionValue(row.actions,"video_view");const reach=row.reach==null?null:number(row.reach),linkClicks=row.inline_link_clicks==null?null:number(row.inline_link_clicks);return {linkClicks,linkCtr:linkClicks==null?null:ratio(linkClicks,impressions),spend,revenue,orders,impressions,clicks,reach,costPerReach:reach==null?null:ratio(spend,reach),cpa:ratio(spend,orders),cvr:ratio(orders,clicks),roas:ratio(revenue,spend),ctr:ratio(clicks,impressions),cpc:ratio(spend,clicks),cpm:ratio(spend*1000,impressions),hookRate:videoViews>0?ratio(videoViews,impressions):null};}
async function adPreviewUrl(adId:string,read:MetaGraph){const result=await read<{data:Array<{body?:string}>}>(`${adId}/previews`,{ad_format:"MOBILE_FEED_STANDARD"});const match=result.data[0]?.body?.match(/<iframe[^>]+src="([^"]+)"/i);return match?.[1]?.replaceAll("&amp;","&")??null;}
async function creativeThumbnail(creativeId:string|undefined,fallback:string|null,read:MetaGraph){if(!creativeId)return fallback;const result=await read<{thumbnail_url?:string}>(creativeId,{fields:"thumbnail_url",thumbnail_width:"600",thumbnail_height:"600"});return result.thumbnail_url??fallback;}

async function campaignTest(campaignId:string,period:{start:string;end:string},read:MetaGraph=graph):Promise<MetaCampaign>{
  const timeRange=JSON.stringify({since:period.start,until:period.end});
  const campaign=await read<MetaCampaignRow>(campaignId,{fields:"id,name,status,effective_status"});
  const [groupInsights,adInsights,ads,campaignInsights]=await Promise.all([
    graphCollection<MetaInsightRow>(read,`${campaignId}/insights`,{time_range:timeRange,fields:"adset_id,adset_name,spend,impressions,reach,clicks,inline_link_clicks,actions,action_values",level:"adset",limit:"200"}),
    graphCollection<MetaInsightRow>(read,`${campaignId}/insights`,{time_range:timeRange,fields:"ad_id,ad_name,adset_id,adset_name,spend,impressions,reach,clicks,inline_link_clicks,actions,action_values",level:"ad",limit:"500"}),
    graphCollection<MetaAdRow>(read,`${campaignId}/ads`,{fields:"id,name,adset_id,configured_status,effective_status,creative{id,body,title,thumbnail_url,video_id,object_type,asset_feed_spec,object_story_spec}",limit:"100"}),
    graphCollection<MetaInsightRow>(read,`${campaignId}/insights`,{time_range:timeRange,fields:"spend,impressions,reach,clicks,inline_link_clicks,actions,action_values",level:"campaign"}),
  ]);
  const insightByAd=new Map(adInsights.data.map(row=>[row.ad_id,row]));
  const testingAds=metaTestingAdInventory(ads.data,adInsights.data);
  const videoIds=new Set(testingAds.filter(ad=>isMetaVideo(ad.name,ad.creative)).map(ad=>ad.id));
  const mediaEntries=await Promise.all(testingAds.map(async ad=>[ad.id,{...(ad.creative?await resolveMetaCreativeLinks(ad.id,ad.creative.id,read):{postUrl:null,previewUrl:null}),thumbnailUrl:await creativeThumbnail(ad.creative?.id,ad.creative?.thumbnail_url??null,read),videoUrl:videoIds.has(ad.id)&&ad.creative?await adPreviewUrl(ad.id,read).catch(()=>null):null}] as const));
  const mediaByAd=new Map(mediaEntries);const adsByGroup=new Map<string,MetaActiveAd[]>();
  for(const ad of testingAds){const insight=insightByAd.get(ad.id);const isVideo=videoIds.has(ad.id);const media=mediaByAd.get(ad.id);const item={adId:ad.id,name:ad.name,status:ad.configured_status,effectiveStatus:ad.effective_status,creativeContent:ad.creative,mediaType:isVideo?"Video" as const:"Image" as const,thumbnailUrl:media?.thumbnailUrl??null,videoUrl:media?.videoUrl??null,postUrl:media?.postUrl??null,previewUrl:media?.previewUrl??media?.videoUrl??null,...performance(insight??{adset_id:ad.adset_id,adset_name:""})};adsByGroup.set(ad.adset_id,[...(adsByGroup.get(ad.adset_id)??[]),item]);}
  for(const items of adsByGroup.values())items.sort((a,b)=>b.spend-a.spend);
  const adGroups=groupInsights.data.map(row=>({campaignName:campaign.name,adGroupId:row.adset_id,name:row.adset_name,activeAds:adsByGroup.get(row.adset_id)??[],...performance(row)})).sort((a,b)=>b.spend-a.spend);
  const metrics=performance(campaignInsights.data[0]??{adset_id:"",adset_name:""});
  const {spend,revenue,orders,clicks,impressions,reach,costPerReach}=metrics;
  const totals={spend,revenue,orders,clicks,impressions,reach,costPerReach};
  return {campaignId,campaignName:campaign.name,campaignStatus:campaign.status,effectiveStatus:campaign.effective_status,adGroups,totals,metrics};
}

async function buildMetaCampaignTest(input:TestingPeriodInput,read:MetaGraph):Promise<MetaCampaignTest>{
  const preset=input.preset??"lastWeek";
  const latest=new Date(Date.now()-86_400_000).toISOString().slice(0,10);
  const period=resolveTestingPeriod(latest,input);
  const campaigns:MetaCampaign[]=[];
  for(const campaignId of META_CAMPAIGN_IDS)campaigns.push(await campaignTest(campaignId,period,read));
  const adGroups=campaigns.flatMap(campaign=>campaign.adGroups);
  const totals=campaigns.reduce((sum,campaign)=>({spend:sum.spend+campaign.totals.spend,revenue:sum.revenue+campaign.totals.revenue,orders:sum.orders+campaign.totals.orders,clicks:sum.clicks+campaign.totals.clicks,impressions:sum.impressions+campaign.totals.impressions}),{spend:0,revenue:0,orders:0,clicks:0,impressions:0});
  return {periodLabel:testingPeriodLabels[preset],period,campaigns,adGroups,totals:{...totals,reach:campaigns.length===1?campaigns[0].totals.reach:null,costPerReach:campaigns.length===1?campaigns[0].totals.costPerReach:null}};
}

/** A fresh result is returned only after every requested Meta resource succeeds. */
export async function fetchFreshMetaCampaignTest(input:TestingPeriodInput={}):Promise<MetaTestingSnapshot>{
  await connection();
  let failure:unknown;
  const read:MetaGraph=async <T>(path:string,params:Record<string,string>):Promise<T>=>{
    try{return await graph<T>(path,params,true);}catch(error){if(!isOptionalMetaLinkPermissionError(params,error))failure??=error;throw error;}
  };
  const data=await buildMetaCampaignTest(input,read);
  // Optional creative helpers historically swallow errors; do not publish their
  // partial result as a successful refresh.
  if(failure)throw failure;
  const daily=await buildMetaOverviewDaily(data,read);
  if(failure)throw failure;
  const extra=input.preset==='mtd'?{history:await metaTestingHistory(read),currency:await metaTestingCurrency(read)}:{};
  if(failure)throw failure;
  return {metricBasis:META_TESTING_BASIS,data,daily,...extra};
}

export async function getMetaCampaignTest(input:TestingPeriodInput={}):Promise<MetaCampaignTest>{
  await connection();
  const snapshot=await readTestingDataSnapshot<MetaTestingSnapshot>("meta",input)??await initializeTestingDataSnapshot("meta",input,()=>fetchFreshMetaCampaignTest(input));
  if(snapshot?.payload?.data && snapshot.payload.daily){
    snapshotDaily.set(snapshot.payload.data,snapshot.payload.daily);
    return snapshot.payload.data;
  }
  return buildMetaCampaignTest(input,graph);
}

/** Background-only source data for testing analysis; cached, never page-triggered AI. */
async function metaTestingHistory(read:MetaGraph=graph){
 const rows:Array<MetaInsightRow&{date_start:string}>=[];
 for(const id of META_CAMPAIGN_IDS){
  let after:string|undefined;
  do{
   const result=await read<{data:Array<MetaInsightRow&{date_start:string}>;paging?:{next?:string;cursors?:{after:string}}}>(`${id}/insights`,{time_range:JSON.stringify({since:'2026-09-01',until:new Date().toISOString().slice(0,10)}),time_increment:'1',fields:'ad_id,ad_name,adset_id,adset_name,spend,impressions,reach,clicks,inline_link_clicks,actions,action_values',level:'ad',limit:'500',...(after?{after}:{})});
   rows.push(...result.data);after=result.paging?.next?result.paging.cursors?.after:undefined;
  }while(after);
 }
 return rows.map(row=>({date:row.date_start,adId:row.ad_id,name:row.ad_name,adGroupId:row.adset_id,...performance(row),linkClicks:Number((row as MetaInsightRow&{inline_link_clicks?:string}).inline_link_clicks??0)}));
}

/** Stable account metadata, used only by the background analysis refresh. */
async function metaTestingCurrency(read:MetaGraph=graph){
 const campaign=await read<{account_id:string}>(META_CAMPAIGN_IDS[0],{fields:"account_id"});
 return (await read<{currency:string}>(`act_${campaign.account_id}`,{fields:"currency"})).currency;
}

/** Campaign daily totals preserve Overview scope; ad rows supply daily asset counts/CVR. */
async function buildMetaOverviewDaily(data:MetaCampaignTest,graph:MetaGraph):Promise<OverviewDailySource>{
 type Daily=MetaInsightRow&{date_start:string};
 const read=async(id:string,level:'campaign'|'ad')=>{
  const rows:Daily[]=[];const seen=new Set<string>();let after:string|undefined;
  do{
   const page=await graph<{data:Daily[];paging?:{next?:string;cursors?:{after:string}}}>(`${id}/insights`,{time_range:JSON.stringify({since:data.period.start,until:data.period.end}),time_increment:'1',level,fields:`spend,impressions,reach,clicks,actions,action_values${level==='ad'?',ad_id,adset_id,adset_name':''}`,limit:'500',...(after?{after}:{})});
   rows.push(...page.data);const next=page.paging?.next?page.paging.cursors?.after:undefined;if(page.paging?.next&&(!next||seen.has(next)))throw Error('Incomplete Meta daily report');if(next)seen.add(next);after=next;
  }while(after);return rows;
 };
 const results=await Promise.all(data.campaigns.map(async campaign=>{
  const [totals,ads]=await Promise.all([read(campaign.campaignId,'campaign'),read(campaign.campaignId,'ad')]);
  const types=new Map(campaign.adGroups.flatMap(group=>group.activeAds.map(ad=>[ad.adId,ad.mediaType==='Image'?'Picture' as const:'Video' as const])));
  return {totals,ads:ads.filter(row=>row.ad_id&&types.has(row.ad_id)).map(row=>({date:row.date_start,entityId:row.ad_id!,assetType:types.get(row.ad_id!)!,...performance(row)}))};
 }));
 // Financial totals include the complete campaign, just like the existing headline.
 // Keep campaign totals separate from selected-period ad rows to avoid counting either twice.
 return {channel:'Meta',rows:results.flatMap(result=>result.ads),totals:results.flatMap(result=>result.totals.map(row=>({date:row.date_start,...performance(row)}))),reach:results.flatMap(result=>result.totals.map(row=>({date:row.date_start,value:performance(row).reach})))};
}

export async function getMetaOverviewDaily(data:MetaCampaignTest):Promise<OverviewDailySource>{
 const daily=snapshotDaily.get(data);
 return daily??buildMetaOverviewDaily(data,graph);
}

export async function getMetaTestingReadoutHistory(){const stored=await readTestingDataSnapshot<MetaTestingSnapshot>('meta',{preset:'mtd'});return stored?.payload.history??metaTestingHistory();}
export async function getMetaTestingCurrency(){const stored=await readTestingDataSnapshot<MetaTestingSnapshot>('meta',{preset:'mtd'});return stored?.payload.currency??metaTestingCurrency();}
