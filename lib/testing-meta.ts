import "server-only";
import { connection } from "next/server";
import { resolveTestingPeriod, testingPeriodLabels, type TestingPeriodInput } from "@/lib/testing-google";

const META_API_VERSION="v25.0";
const META_CAMPAIGN_ID="120220339814410383";
type MetaAction={action_type:string;value:string};
type MetaInsightRow={ad_id?:string;ad_name?:string;adset_id:string;adset_name:string;spend?:string;impressions?:string;clicks?:string;actions?:MetaAction[];action_values?:MetaAction[]};
type MetaAdRow={id:string;name:string;adset_id:string;effective_status?:string;creative?:{id?:string;thumbnail_url?:string;video_id?:string;asset_feed_spec?:{videos?:Array<{video_id?:string}>}}};
export type MetaActiveAd={adId:string;name:string;mediaType:"Image"|"Video";thumbnailUrl:string|null;videoUrl:string|null;spend:number;revenue:number;orders:number;impressions:number;clicks:number;cpa:number|null;cvr:number|null;roas:number|null;ctr:number|null;cpc:number|null;cpm:number|null;hookRate:number|null};
export type MetaAdGroupMetric={adGroupId:string;name:string;activeAds:MetaActiveAd[];spend:number;revenue:number;orders:number;impressions:number;clicks:number;cpa:number|null;cvr:number|null;roas:number|null;ctr:number|null;cpc:number|null;cpm:number|null;hookRate:number|null};
export type MetaCampaignTest={campaignName:string;periodLabel:string;period:{start:string;end:string};adGroups:MetaAdGroupMetric[];totals:{spend:number;revenue:number;orders:number;clicks:number}};

function token(){const value=process.env.META_ACCESS_TOKEN;if(!value)throw new Error("Meta credentials are not configured.");return value;}
async function graph<T>(path:string,params:Record<string,string>):Promise<T>{const query=new URLSearchParams({...params,access_token:token()});const response=await fetch(`https://graph.facebook.com/${META_API_VERSION}/${path}?${query}`,{next:{revalidate:3600}});if(!response.ok){const body=await response.text();throw new Error(`Meta API request failed (${response.status}): ${body.slice(0,300)}`);}return response.json() as Promise<T>;}
const number=(value?:string)=>Number(value??0);
const ratio=(a:number,b:number)=>b>0?a/b:null;
const actionValue=(actions:MetaAction[]|undefined,type:string)=>number(actions?.find(action=>action.action_type===type)?.value);
const namedVideo=(name:string)=>/(^|[_\s-])video([_\s-]|$)/i.test(name);
function performance(row:MetaInsightRow){const spend=number(row.spend),revenue=actionValue(row.action_values,"omni_purchase"),orders=actionValue(row.actions,"omni_purchase"),impressions=number(row.impressions),clicks=number(row.clicks),videoViews=actionValue(row.actions,"video_view");return {spend,revenue,orders,impressions,clicks,cpa:ratio(spend,orders),cvr:ratio(orders,clicks),roas:ratio(revenue,spend),ctr:ratio(clicks,impressions),cpc:ratio(spend,clicks),cpm:ratio(spend*1000,impressions),hookRate:videoViews>0?ratio(videoViews,impressions):null};}
async function adPreviewUrl(adId:string){const result=await graph<{data:Array<{body?:string}>}>(`${adId}/previews`,{ad_format:"MOBILE_FEED_STANDARD"});const match=result.data[0]?.body?.match(/<iframe[^>]+src="([^"]+)"/i);return match?.[1]?.replaceAll("&amp;","&")??null;}
async function creativeThumbnail(creativeId:string|undefined,fallback:string|null){if(!creativeId)return fallback;const result=await graph<{thumbnail_url?:string}>(creativeId,{fields:"thumbnail_url",thumbnail_width:"600",thumbnail_height:"600"});return result.thumbnail_url??fallback;}

export async function getMetaCampaignTest(input:TestingPeriodInput={}):Promise<MetaCampaignTest>{
  await connection();
  const preset=input.preset??"lastWeek";
  const campaignSummary=await graph<{data:Array<{campaign_name:string;date_stop:string}>}>(`${META_CAMPAIGN_ID}/insights`,{date_preset:"last_30d",fields:"campaign_name",level:"campaign"});
  const summary=campaignSummary.data[0];if(!summary)throw new Error("The selected Meta campaign has no recent data.");
  const period=resolveTestingPeriod(summary.date_stop,input);const timeRange=JSON.stringify({since:period.start,until:period.end});
  const [groupInsights,adInsights,ads]=await Promise.all([
    graph<{data:MetaInsightRow[]}>(`${META_CAMPAIGN_ID}/insights`,{time_range:timeRange,fields:"adset_id,adset_name,spend,impressions,clicks,actions,action_values",level:"adset",limit:"200"}),
    graph<{data:MetaInsightRow[]}>(`${META_CAMPAIGN_ID}/insights`,{time_range:timeRange,fields:"ad_id,ad_name,adset_id,adset_name,spend,impressions,clicks,actions,action_values",level:"ad",limit:"500"}),
    graph<{data:MetaAdRow[]}>(`${META_CAMPAIGN_ID}/ads`,{fields:"id,name,adset_id,effective_status,creative{id,thumbnail_url,video_id,asset_feed_spec}",effective_status:"['ACTIVE']",limit:"500"}),
  ]);
  const insightByAd=new Map(adInsights.data.map(row=>[row.ad_id,row]));
  const active=ads.data.filter(ad=>ad.effective_status==="ACTIVE");
  const videoIds=new Set(active.filter(ad=>Boolean(ad.creative?.video_id||ad.creative?.asset_feed_spec?.videos?.length)||namedVideo(ad.name)).map(ad=>ad.id));
  const mediaEntries=await Promise.all(active.map(async ad=>[ad.id,{thumbnailUrl:await creativeThumbnail(ad.creative?.id,ad.creative?.thumbnail_url??null),videoUrl:videoIds.has(ad.id)?await adPreviewUrl(ad.id):null}] as const));
  const mediaByAd=new Map(mediaEntries);const adsByGroup=new Map<string,MetaActiveAd[]>();
  for(const ad of active){const insight=insightByAd.get(ad.id);const isVideo=videoIds.has(ad.id);const media=mediaByAd.get(ad.id);const item={adId:ad.id,name:ad.name,mediaType:isVideo?"Video" as const:"Image" as const,thumbnailUrl:media?.thumbnailUrl??null,videoUrl:media?.videoUrl??null,...performance(insight??{adset_id:ad.adset_id,adset_name:""})};adsByGroup.set(ad.adset_id,[...(adsByGroup.get(ad.adset_id)??[]),item]);}
  for(const items of adsByGroup.values())items.sort((a,b)=>b.spend-a.spend);
  const adGroups=groupInsights.data.map(row=>({adGroupId:row.adset_id,name:row.adset_name,activeAds:adsByGroup.get(row.adset_id)??[],...performance(row)})).sort((a,b)=>b.spend-a.spend);
  const totals=adGroups.reduce((sum,row)=>({spend:sum.spend+row.spend,revenue:sum.revenue+row.revenue,orders:sum.orders+row.orders,clicks:sum.clicks+row.clicks}),{spend:0,revenue:0,orders:0,clicks:0});
  return {campaignName:summary.campaign_name,periodLabel:testingPeriodLabels[preset],period,adGroups,totals};
}
