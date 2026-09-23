import "server-only";
import { connection } from "next/server";
import { resolveTestingPeriod, testingPeriodLabels, type TestingPeriodInput } from "@/lib/testing-google";

const META_API_VERSION="v25.0";
const META_CAMPAIGN_IDS=[
  "120220339814410383",
  "120250932457990383",
  "120250932092010383",
  "120250932192210383",
] as const;
type MetaAction={action_type:string;value:string};
type MetaInsightRow={ad_id?:string;ad_name?:string;adset_id:string;adset_name:string;spend?:string;impressions?:string;clicks?:string;actions?:MetaAction[];action_values?:MetaAction[]};
type MetaAdRow={id:string;name:string;adset_id:string;configured_status?:string;effective_status?:string;creative?:{id?:string;thumbnail_url?:string;video_id?:string}};
type MetaCampaignRow={id:string;name:string;status:string;effective_status:string};
export type MetaActiveAd={adId:string;name:string;mediaType:"Image"|"Video";thumbnailUrl:string|null;videoUrl:string|null;spend:number;revenue:number;orders:number;impressions:number;clicks:number;cpa:number|null;cvr:number|null;roas:number|null;ctr:number|null;cpc:number|null;cpm:number|null;hookRate:number|null};
export type MetaAdGroupMetric={campaignName:string;adGroupId:string;name:string;activeAds:MetaActiveAd[];spend:number;revenue:number;orders:number;impressions:number;clicks:number;cpa:number|null;cvr:number|null;roas:number|null;ctr:number|null;cpc:number|null;cpm:number|null;hookRate:number|null};
export type MetaCampaign={campaignId:string;campaignName:string;campaignStatus:string;effectiveStatus:string;adGroups:MetaAdGroupMetric[];totals:{spend:number;revenue:number;orders:number;clicks:number}};
export type MetaCampaignTest={periodLabel:string;period:{start:string;end:string};campaigns:MetaCampaign[];adGroups:MetaAdGroupMetric[];totals:{spend:number;revenue:number;orders:number;clicks:number}};

function token(){const value=process.env.META_ACCESS_TOKEN;if(!value)throw new Error("Meta credentials are not configured.");return value;}
async function graph<T>(path:string,params:Record<string,string>):Promise<T>{const query=new URLSearchParams({...params,access_token:token()});const response=await fetch(`https://graph.facebook.com/${META_API_VERSION}/${path}?${query}`,{next:{revalidate:3600}});if(!response.ok){const body=await response.text();throw new Error(`Meta API request failed for ${path} (${response.status}): ${body.slice(0,300)}`);}return response.json() as Promise<T>;}
const number=(value?:string)=>Number(value??0);
const ratio=(a:number,b:number)=>b>0?a/b:null;
const actionValue=(actions:MetaAction[]|undefined,type:string)=>number(actions?.find(action=>action.action_type===type)?.value);
const namedVideo=(name:string)=>/(^|[_\s-])video([_\s-]|$)/i.test(name);
function performance(row:MetaInsightRow){const spend=number(row.spend),revenue=actionValue(row.action_values,"omni_purchase"),orders=actionValue(row.actions,"omni_purchase"),impressions=number(row.impressions),clicks=number(row.clicks),videoViews=actionValue(row.actions,"video_view");return {spend,revenue,orders,impressions,clicks,cpa:ratio(spend,orders),cvr:ratio(orders,clicks),roas:ratio(revenue,spend),ctr:ratio(clicks,impressions),cpc:ratio(spend,clicks),cpm:ratio(spend*1000,impressions),hookRate:videoViews>0?ratio(videoViews,impressions):null};}
async function adPreviewUrl(adId:string){const result=await graph<{data:Array<{body?:string}>}>(`${adId}/previews`,{ad_format:"MOBILE_FEED_STANDARD"});const match=result.data[0]?.body?.match(/<iframe[^>]+src="([^"]+)"/i);return match?.[1]?.replaceAll("&amp;","&")??null;}
async function creativeThumbnail(creativeId:string|undefined,fallback:string|null){if(!creativeId)return fallback;const result=await graph<{thumbnail_url?:string}>(creativeId,{fields:"thumbnail_url",thumbnail_width:"600",thumbnail_height:"600"});return result.thumbnail_url??fallback;}

async function campaignTest(campaignId:string,period:{start:string;end:string}):Promise<MetaCampaign>{
  const timeRange=JSON.stringify({since:period.start,until:period.end});
  const campaign=await graph<MetaCampaignRow>(campaignId,{fields:"id,name,status,effective_status"});
  const [groupInsights,adInsights,ads]=await Promise.all([
    graph<{data:MetaInsightRow[]}>(`${campaignId}/insights`,{time_range:timeRange,fields:"adset_id,adset_name,spend,impressions,clicks,actions,action_values",level:"adset",limit:"200"}),
    graph<{data:MetaInsightRow[]}>(`${campaignId}/insights`,{time_range:timeRange,fields:"ad_id,ad_name,adset_id,adset_name,spend,impressions,clicks,actions,action_values",level:"ad",limit:"500"}),
    graph<{data:MetaAdRow[]}>(`${campaignId}/ads`,{fields:"id,name,adset_id,configured_status,effective_status,creative",limit:"100"}),
  ]);
  const insightByAd=new Map(adInsights.data.map(row=>[row.ad_id,row]));
  const active=ads.data.filter(ad=>ad.configured_status==="ACTIVE"||ad.effective_status==="ACTIVE");
  const videoIds=new Set(active.filter(ad=>Boolean(ad.creative?.video_id)||namedVideo(ad.name)).map(ad=>ad.id));
  const mediaEntries=await Promise.all(active.map(async ad=>[ad.id,{thumbnailUrl:await creativeThumbnail(ad.creative?.id,ad.creative?.thumbnail_url??null),videoUrl:videoIds.has(ad.id)?await adPreviewUrl(ad.id):null}] as const));
  const mediaByAd=new Map(mediaEntries);const adsByGroup=new Map<string,MetaActiveAd[]>();
  for(const ad of active){const insight=insightByAd.get(ad.id);const isVideo=videoIds.has(ad.id);const media=mediaByAd.get(ad.id);const item={adId:ad.id,name:ad.name,mediaType:isVideo?"Video" as const:"Image" as const,thumbnailUrl:media?.thumbnailUrl??null,videoUrl:media?.videoUrl??null,...performance(insight??{adset_id:ad.adset_id,adset_name:""})};adsByGroup.set(ad.adset_id,[...(adsByGroup.get(ad.adset_id)??[]),item]);}
  for(const items of adsByGroup.values())items.sort((a,b)=>b.spend-a.spend);
  const adGroups=groupInsights.data.map(row=>({campaignName:campaign.name,adGroupId:row.adset_id,name:row.adset_name,activeAds:adsByGroup.get(row.adset_id)??[],...performance(row)})).sort((a,b)=>b.spend-a.spend);
  const totals=adGroups.reduce((sum,row)=>({spend:sum.spend+row.spend,revenue:sum.revenue+row.revenue,orders:sum.orders+row.orders,clicks:sum.clicks+row.clicks}),{spend:0,revenue:0,orders:0,clicks:0});
  return {campaignId,campaignName:campaign.name,campaignStatus:campaign.status,effectiveStatus:campaign.effective_status,adGroups,totals};
}

export async function getMetaCampaignTest(input:TestingPeriodInput={}):Promise<MetaCampaignTest>{
  await connection();
  const preset=input.preset??"lastWeek";
  const summaries=await Promise.all(META_CAMPAIGN_IDS.map(id=>graph<{data:Array<{date_stop:string}>}>(`${id}/insights`,{date_preset:"last_30d",fields:"campaign_id",level:"campaign"})));
  const latest=summaries.flatMap(result=>result.data).map(row=>row.date_stop).sort().at(-1)??new Date(Date.now()-86_400_000).toISOString().slice(0,10);
  const period=resolveTestingPeriod(latest,input);
  const campaigns:MetaCampaign[]=[];
  for(const campaignId of META_CAMPAIGN_IDS)campaigns.push(await campaignTest(campaignId,period));
  const adGroups=campaigns.flatMap(campaign=>campaign.adGroups);
  const totals=campaigns.reduce((sum,campaign)=>({spend:sum.spend+campaign.totals.spend,revenue:sum.revenue+campaign.totals.revenue,orders:sum.orders+campaign.totals.orders,clicks:sum.clicks+campaign.totals.clicks}),{spend:0,revenue:0,orders:0,clicks:0});
  return {periodLabel:testingPeriodLabels[preset],period,campaigns,adGroups,totals};
}
