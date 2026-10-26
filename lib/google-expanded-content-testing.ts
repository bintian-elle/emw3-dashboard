import "server-only";
import {compareCampaignNamesNewestFirst} from "@/lib/campaign-name-order";
import {connection} from "next/server";
import {mkdir,readFile,writeFile,rename} from "node:fs/promises";
import path from "node:path";
import {queryGoogleTestingApi} from "@/lib/google-testing-api";
import {resolveTestingPeriod,testingPeriodLabels,type TestingPeriodInput} from "@/lib/testing-google";
import {PMAX_TESTING_BASIS,pmaxMetrics,pmaxTestingDays,fetchPmaxAssetPerformance,type PmaxDailyRow} from "@/lib/pmax-testing-performance";
import type {GoogleAdMetrics} from "@/lib/google-ad-performance";
export type ExpandedChannel="pmax"|"demand-gen";
export type TestingAsset={id:string;name?:string;type:string;textAsset?:{text:string};imageAsset?:{fullSize?:{url:string}};youtubeVideoAsset?:{youtubeVideoId:string;youtubeVideoTitle?:string}};
type Campaign={id:string;name:string;status:string};
type Group={id:string;name:string;status:string};
type Ad={id:string;name:string;type:string;demandGenMultiAssetAd?:Record<string,Array<{asset?:string;text?:string}>>;demandGenVideoResponsiveAd?:Record<string,Array<{asset?:string;text?:string}>>};
type InventoryRow={campaign:Campaign;assetGroup?:Group;adGroup?:Group;adGroupAd?:{status:string;ad:Ad}};
type DailyRow={campaign:{id:string};assetGroup?:{id:string};adGroupAd?:{ad:{id:string}};segments:{date:string};metrics:{costMicros?:string;conversionsValue?:number;conversions?:number;impressions?:string|null;clicks?:string}};
type AssetRow={assetGroup:{id:string};asset:TestingAsset;assetGroupAsset:{fieldType:string;status?:string;source?:string}};
export type PmaxAssetPerformance={assetId:string;fieldType:string;status:string;metrics:GoogleAdMetrics};
type Snapshot={version:2|3;capturedAt:number;end:string;inventory:InventoryRow[];days:DailyRow[];assets:AssetRow[];adAssets:TestingAsset[];pmaxProductDays?:DailyRow[];pmaxAssetDays?:PmaxDailyRow[]};
export type ExpandedTestRow={adType?:string;id:string;name:string;status:string;metrics:GoogleAdMetrics;metricsBasis?:string;assetPerformance?:PmaxAssetPerformance[];assets:TestingAsset[];texts:string[]};
export type ExpandedTestCampaign={id:string;name:string;status:string;groups:Array<{id:string;name:string;rows:ExpandedTestRow[]}>};
export type ExpandedTestingData={channel:ExpandedChannel;period:{start:string;end:string};periodLabel:string;campaigns:ExpandedTestCampaign[]};
const names=["EM-PMAX-Conquesting-June26","EM-PMAX-Bestseller-Oct25","EM-PMAX-AllProduct-Mar25"];
const pending=new Map<ExpandedChannel,Promise<Snapshot>>();
function metrics(rows:DailyRow[]):GoogleAdMetrics{return pmaxMetrics(rows);}
function testingDays(data:Snapshot,channel:ExpandedChannel):DailyRow[]{
 if(channel!=="pmax")return data.days;
 if(!data.pmaxProductDays||!data.pmaxAssetDays)throw Error("PMax testing asset metrics are unavailable.");
 return pmaxTestingDays(data.days,data.pmaxProductDays);
}
async function load(channel:ExpandedChannel):Promise<Snapshot>{
 const directory=process.env.GOOGLE_ADS_CREATIVE_DIR||path.join(process.cwd(),".state/google-creatives");const file=path.join(directory,`${channel}-content-testing.json`),end=new Date(Date.now()-(channel==="pmax"?86400000:0)).toISOString().slice(0,10);
 try{const saved=JSON.parse(await readFile(file,"utf8")) as Snapshot;if(saved.version===(channel==="pmax"?3:2)&&(channel!=="pmax"||(Array.isArray(saved.pmaxProductDays)&&Array.isArray(saved.pmaxAssetDays)))&&saved.end>=end&&Date.now()-saved.capturedAt<6*3600000)return saved;}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
 const pmax=channel==="pmax",scope=pmax?`campaign.name IN (${names.map(n=>`'${n}'`).join(",")}) AND asset_group.name LIKE '%Content Testing%'`:`campaign.name='EM-DG-Conversion-Prospecting-Purchase-April26' AND ad_group.id = 202844993442 AND ad_group_ad.ad.name LIKE '%content testing%'`;
 const adFields=["marketing_images","square_marketing_images","portrait_marketing_images","tall_portrait_marketing_images","headlines","descriptions"].map(field=>`ad_group_ad.ad.demand_gen_multi_asset_ad.${field}`).concat(["videos","headlines","descriptions"].map(field=>`ad_group_ad.ad.demand_gen_video_responsive_ad.${field}`));
 const inventory=await queryGoogleTestingApi<InventoryRow>(`SELECT campaign.id,campaign.name,campaign.status,${pmax?"asset_group.id,asset_group.name,asset_group.status":"ad_group.id,ad_group.name,ad_group.status,ad_group_ad.status,ad_group_ad.ad.id,ad_group_ad.ad.name,ad_group_ad.ad.type,"+adFields.join(",")} FROM ${pmax?"asset_group":"ad_group_ad"} WHERE ${scope}`);
 const fields="segments.date,metrics.cost_micros,metrics.conversions_value,metrics.conversions,metrics.impressions,metrics.clicks";
 const days=inventory.length?await queryGoogleTestingApi<DailyRow>(`SELECT campaign.id,${pmax?"asset_group.id":"ad_group_ad.ad.id"},${fields} FROM ${pmax?"asset_group":"ad_group_ad"} WHERE ${scope} AND segments.date BETWEEN '2025-01-01' AND '${end}'`):[];
 let assets:AssetRow[]=[],adAssets:TestingAsset[]=[];
 const assetFields="asset.id,asset.name,asset.type,asset.text_asset.text,asset.image_asset.full_size.url,asset.youtube_video_asset.youtube_video_id,asset.youtube_video_asset.youtube_video_title";
 if(pmax&&inventory.length)assets=await queryGoogleTestingApi<AssetRow>(`SELECT asset_group.id,asset_group_asset.field_type,asset_group_asset.status,asset_group_asset.source,${assetFields} FROM asset_group_asset WHERE asset_group.id IN (${inventory.map(r=>r.assetGroup!.id).join(",")})`);
 if(!pmax){const ids=[...new Set(inventory.flatMap(row=>Object.values(row.adGroupAd!.ad.demandGenMultiAssetAd??row.adGroupAd!.ad.demandGenVideoResponsiveAd??{}).flatMap(items=>items.flatMap(item=>item.asset?[item.asset.split('/').at(-1)!]:[]))))];if(ids.length)adAssets=(await queryGoogleTestingApi<{asset:TestingAsset}>(`SELECT ${assetFields} FROM asset WHERE asset.id IN (${ids.join(",")})`)).map(row=>row.asset);}
 const pmaxPerformance=pmax?await fetchPmaxAssetPerformance(queryGoogleTestingApi,inventory.map(r=>r.assetGroup!.id),end):null;
 const result:Snapshot={version:pmax?3:2,capturedAt:Date.now(),end,inventory,days,assets,adAssets,...(pmaxPerformance?{pmaxProductDays:pmaxPerformance.productDays,pmaxAssetDays:pmaxPerformance.assetDays}:{})};await mkdir(directory,{recursive:true,mode:0o700});const temp=`${file}.${process.pid}.tmp`;await writeFile(temp,JSON.stringify(result),{mode:0o600});await rename(temp,file);return result;
}
export async function getExpandedGoogleTesting(channel:ExpandedChannel,input:TestingPeriodInput={}):Promise<ExpandedTestingData>{
 await connection();let request=pending.get(channel);if(!request){request=load(channel);pending.set(channel,request);void request.finally(()=>{setTimeout(()=>{if(pending.get(channel)===request)pending.delete(channel);},60000).unref();}).catch(()=>{});}const data=await request;
 const period=resolveTestingPeriod(new Date(Date.now()-86400000).toISOString().slice(0,10),input);
 const campaigns:ExpandedTestCampaign[]=[],daily=testingDays(data,channel);
 for(const row of data.inventory){let campaign=campaigns.find(c=>c.id===row.campaign.id);if(!campaign){campaign={...row.campaign,groups:[]};campaigns.push(campaign);}const g=row.assetGroup??row.adGroup!;let group=campaign.groups.find(item=>item.id===g.id);if(!group){group={id:g.id,name:g.name,rows:[]};campaign.groups.push(group);}const id=row.assetGroup?.id??row.adGroupAd!.ad.id;
  const selected=daily.filter(d=>(d.assetGroup?.id??d.adGroupAd?.ad.id)===id&&d.segments.date>=period.start&&d.segments.date<=period.end);
  const ad=row.adGroupAd?.ad,parts=Object.values(ad?.demandGenMultiAssetAd??ad?.demandGenVideoResponsiveAd??{}).flat();const refs=new Set(parts.flatMap(part=>part.asset?[part.asset.split('/').at(-1)]:[]));
  const selectedAssetDays=(data.pmaxAssetDays??[]).filter(day=>day.assetGroup?.id===id&&day.segments.date>=period.start&&day.segments.date<=period.end);
  const links=channel==="pmax"?data.assets.filter(a=>a.assetGroup.id===id&&["TEXT","IMAGE","YOUTUBE_VIDEO"].includes(a.asset.type)&&a.assetGroupAsset.source!=="AUTOMATICALLY_CREATED"&&(a.assetGroupAsset.status!=="REMOVED"||selectedAssetDays.some(day=>day.asset?.id===a.asset.id))):[];
  const assets=channel==="pmax"?links.map(a=>a.asset):data.adAssets.filter(a=>refs.has(a.id));
  const assetPerformance=links.map(link=>({assetId:link.asset.id,fieldType:link.assetGroupAsset.fieldType,status:link.assetGroupAsset.status??"UNKNOWN",metrics:pmaxMetrics(selectedAssetDays.filter(day=>day.asset?.id===link.asset.id&&day.assetGroupAsset?.fieldType===link.assetGroupAsset.fieldType))}));
  assetPerformance.sort((a,b)=>Number(b.status==="ENABLED")-Number(a.status==="ENABLED")||a.assetId.localeCompare(b.assetId));
  const uniqueAssets=[...new Map(assets.map(a=>[a.id,a])).values()];group.rows.push({id,adType:ad?.type,name:ad?.name??g.name,status:row.adGroupAd?.status??g.status,metrics:metrics(selected),...(channel==="pmax"?{metricsBasis:PMAX_TESTING_BASIS,assetPerformance}:{}),assets:uniqueAssets,texts:channel==="pmax"?uniqueAssets.flatMap(a=>a.textAsset?[a.textAsset.text]:[]):parts.flatMap(part=>part.text?[part.text]:[])});
 }
 for(const campaign of campaigns)for(const group of campaign.groups)group.rows.sort((a,b)=>Number(b.status==="ENABLED")-Number(a.status==="ENABLED")||a.name.localeCompare(b.name));
 campaigns.sort((a,b)=>compareCampaignNamesNewestFirst(a.name,b.name));return {channel,period,periodLabel:testingPeriodLabels[input.preset??"lastWeek"],campaigns};
}

// Keep Overview and channel pages on exactly the same test rows and period.
export function expandedGoogleReports(data:ExpandedTestingData):import("@/lib/testing-google").GoogleSearchTest[]{
 return data.campaigns.flatMap(c=>c.groups.flatMap(g=>{
  const types=data.channel==="pmax"?["Mixed" as const]:["Video" as const,"Picture" as const];
  return types.flatMap(creativeType=>{
   const rows=g.rows.filter(row=>creativeType==="Mixed"||(row.adType==="DEMAND_GEN_VIDEO_RESPONSIVE_AD"?"Video":"Picture")===creativeType);
   if(!rows.length)return [];
   return [{campaignName:c.name,campaignStatus:c.status,period:data.period,periodLabel:data.periodLabel,adCount:rows.length,creativeType,groups:rows.map(row=>({label:"" as const,name:row.name,adGroupId:row.id,...row.metrics}))}];
  });
 }));
}

/** Reuse the same daily snapshot; no per-period API request for AI history. */
export async function getExpandedGoogleTestingReadoutHistory(channel:ExpandedChannel){
 const data=await load(channel);
 return {capturedAt:new Date(data.capturedAt).toISOString(),rows:testingDays(data,channel).filter(row=>row.segments.date>='2026-09-01').map(row=>({date:row.segments.date,campaignId:row.campaign.id,entityId:row.assetGroup?.id??row.adGroupAd?.ad.id,...metrics([row])}))};
}
