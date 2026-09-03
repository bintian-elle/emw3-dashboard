import "server-only";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { resolveTestingPeriod, testingPeriodLabels, type TestingPeriodInput } from "@/lib/testing-google";

const definitions=[
  {key:"image",title:"Campaign 1 · Image",campaignName:"EM-DG-Conversion-Prospecting-Purchase-April26",adGroupName:"IMG+Shopping_PurchaserLAL5%",adGroupId:"183243510646",mediaType:"image" as const},
  {key:"video",title:"Campaign 2 · Video",campaignName:"EM-DG-Conversion_Retargeting_Purchase_Nov25",adGroupName:"Email Subs & Youtube Viewers Retargeting",adGroupId:"197532245748",mediaType:"video" as const},
];

export type DemandGenMetricRow={spend:number;revenue:number;orders:number;impressions:number;clicks:number;cpa:number|null;cvr:number|null;roas:number|null;ctr:number|null;cpc:number|null};
export type DemandGenAd=DemandGenMetricRow&{adId:string;name:string;adType:string;previewType:string;previewUrl:string|null;videoUrl:string|null};
export type DemandGenCampaign=DemandGenMetricRow&{key:string;title:string;campaignName:string;adGroupName:string;adGroupId:string;mediaType:"image"|"video";previewUrl:string|null;groups:Array<{label:"Group A"|"Group B"}>};
export type DemandGenData={period:{start:string;end:string}|null;periodLabel:string;campaigns:DemandGenCampaign[]};

const num=(value:unknown)=>Number(value??0);const ratio=(a:number,b:number)=>b>0?a/b:null;
function metrics(row:Record<string,unknown>):DemandGenMetricRow{const spend=num(row.spend),revenue=num(row.revenue),orders=num(row.orders),impressions=num(row.impressions),clicks=num(row.clicks);return {spend,revenue,orders,impressions,clicks,cpa:ratio(spend,orders),cvr:ratio(orders,clicks),roas:ratio(revenue,spend),ctr:ratio(clicks,impressions),cpc:ratio(spend,clicks)};}
async function latestAndPeriod(input:TestingPeriodInput){const latest=await db.query<{latest_date:string}>(`SELECT MAX(date)::text latest_date FROM fact_ad_group_daily WHERE ad_group_id=ANY($1::text[]) AND date<CURRENT_DATE`,[definitions.map(item=>item.adGroupId)]);if(!latest.rows[0]?.latest_date)return null;return resolveTestingPeriod(latest.rows[0].latest_date,input);}

export async function getDemandGenData(input:TestingPeriodInput={}):Promise<DemandGenData>{
  await connection();const preset=input.preset??"lastWeek";const period=await latestAndPeriod(input);if(!period)return {period:null,periodLabel:testingPeriodLabels[preset],campaigns:[]};const ids=definitions.map(item=>item.adGroupId);
  const totals=await db.query<Record<string,unknown>>(`SELECT ad_group_id,SUM(cost_micros)/1000000.0 spend,SUM(conversions_value) revenue,SUM(conversions) orders,SUM(impressions) impressions,SUM(clicks) clicks FROM fact_ad_group_daily WHERE ad_group_id=ANY($1::text[]) AND date BETWEEN $2::date AND $3::date GROUP BY ad_group_id`,[ids,period.start,period.end]);
  const previews=await db.query<Record<string,unknown>>(`SELECT ad_group_id,ad_id,MAX(preview_type) preview_type,MAX(preview_thumbnail_url) preview_thumbnail_url,MAX(youtube_video_url) youtube_video_url,SUM(spend) spend FROM v_ad_performance_daily WHERE ad_group_id=ANY($1::text[]) AND date BETWEEN $2::date AND $3::date GROUP BY ad_group_id,ad_id ORDER BY ad_group_id,spend DESC,ad_id`,[ids,period.start,period.end]);
  const campaigns=definitions.map(def=>{const row=totals.rows.find(item=>String(item.ad_group_id)===def.adGroupId)??{};const preview=previews.rows.find(item=>String(item.ad_group_id)===def.adGroupId&&(def.mediaType!=="video"||Boolean(item.youtube_video_url)));return {...def,...metrics(row),previewUrl:preview?.preview_thumbnail_url?String(preview.preview_thumbnail_url):null,groups:[{label:"Group A" as const},{label:"Group B" as const}]};});
  return {period,periodLabel:testingPeriodLabels[preset],campaigns};
}

export async function getDemandGenAds(campaignKey:string,input:TestingPeriodInput={}):Promise<{campaign:DemandGenCampaign;ads:DemandGenAd[];period:{start:string;end:string};periodLabel:string}|null>{
  await connection();const data=await getDemandGenData(input);const campaign=data.campaigns.find(item=>item.key===campaignKey);if(!campaign||!data.period)return null;
  const rows=await db.query<Record<string,unknown>>(`SELECT ad_id,ad_name,ad_type,MAX(preview_type) preview_type,MAX(preview_thumbnail_url) preview_thumbnail_url,MAX(youtube_video_url) youtube_video_url,SUM(spend) spend,SUM(conversions_value) revenue,SUM(conversions) orders,SUM(impressions) impressions,SUM(clicks) clicks FROM v_ad_performance_daily WHERE ad_group_id=$1 AND date BETWEEN $2::date AND $3::date GROUP BY ad_id,ad_name,ad_type ORDER BY (MAX(youtube_video_url) IS NOT NULL) DESC,spend DESC,ad_id`,[campaign.adGroupId,data.period.start,data.period.end]);
  const ads=rows.rows.map(row=>({adId:String(row.ad_id),name:String(row.ad_name??"Unnamed ad"),adType:String(row.ad_type??""),previewType:String(row.preview_type??"UNKNOWN"),...metrics(row),previewUrl:row.preview_thumbnail_url?String(row.preview_thumbnail_url):null,videoUrl:row.youtube_video_url?String(row.youtube_video_url):null}));
  return {campaign,ads,period:data.period,periodLabel:data.periodLabel};
}
