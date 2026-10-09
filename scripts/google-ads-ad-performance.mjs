import {readFile,writeFile,rename} from "node:fs/promises";
import path from "node:path";
import {googleAdsReader} from "./google-ads-creatives.mjs";
const {default:env}=await import("@next/env");env.loadEnvConfig(process.cwd());
const directory=process.env.GOOGLE_ADS_CREATIVE_DIR||path.join(process.cwd(),".state/google-creatives");
try{
 const archive=JSON.parse(await readFile(path.join(directory,"archive.json"),"utf8"));
 const ids=archive.campaigns.map(row=>row.id);if(!ids.length||ids.some(id=>!/^\d+$/.test(id)))throw Error("Invalid campaign archive");
 const end=new Date(Date.now()-86400000).toISOString().slice(0,10),start="2025-01-01";
 const search=await googleAdsReader();
 const rows=await search(`SELECT campaign.id,ad_group.id,ad_group_ad.ad.id,segments.date,metrics.cost_micros,metrics.conversions,metrics.conversions_value,metrics.impressions,metrics.clicks FROM ad_group_ad WHERE campaign.id IN (${ids.join(",")}) AND segments.date BETWEEN '${start}' AND '${end}' AND ad_group_ad.status IN ('ENABLED','PAUSED','REMOVED')`);
 const days=rows.map(row=>({campaignId:row.campaign.id,groupId:row.adGroup.id,adId:row.adGroupAd.ad.id,date:row.segments.date,spend:Number(row.metrics.costMicros||0)/1e6,revenue:Number(row.metrics.conversionsValue||0),orders:Number(row.metrics.conversions||0),impressions:Number(row.metrics.impressions||0),clicks:Number(row.metrics.clicks||0)}));
 const snapshot={version:1,source:"Google Ads API v24",capturedAt:new Date().toISOString(),range:{start,end},days};
 const filename=path.join(directory,"ad-performance.json"),temporary=`${filename}.${process.pid}.tmp`;
 await writeFile(temporary,JSON.stringify(snapshot),{mode:0o600});await rename(temporary,filename);
 console.log({campaigns:ids.length,dailyRows:days.length,range:snapshot.range});
}catch(error){console.error(error.message);process.exitCode=1;}
