import {mkdir,writeFile,rename} from "node:fs/promises";
import path from "node:path";

export async function googleAdsReader(env=process.env,request=fetch) {
 const body=new URLSearchParams({client_id:env.GOOGLE_ADS_CLIENT_ID||"",client_secret:env.GOOGLE_ADS_SECRET||"",refresh_token:env.GOOGLE_ADS_TOKEN||"",grant_type:"refresh_token"});
 if([...body.values()].some(value=>!value))throw Error("Google Ads OAuth configuration is incomplete");
 const response=await request("https://oauth2.googleapis.com/token",{method:"POST",body,signal:AbortSignal.timeout(30000)});
 const token=await response.json();if(!response.ok||!token.access_token)throw Error(`Google Ads OAuth failed (${response.status})`);
 const customer=(env.GOOGLE_ADS_CUSTOMER_ID||"").replaceAll("-","");if(!/^\d+$/.test(customer))throw Error("Invalid Google Ads customer ID");
 return async query=>{
  const headers={Authorization:`Bearer ${token.access_token}`,"Content-Type":"application/json"};
  if(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID)headers["login-customer-id"]=env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replaceAll("-","");
  const response=await request(`https://googleads.googleapis.com/v24/customers/${customer}/googleAds:searchStream`,{method:"POST",headers,body:JSON.stringify({query}),signal:AbortSignal.timeout(60000)});
  const result=await response.json();if(!response.ok){const failure=Array.isArray(result)?result.find(item=>item.error)?.error:result.error;const codes=failure?.details?.flatMap(detail=>(detail.errors||[]).map(error=>Object.values(error.errorCode||{}).join(":")))||[];throw Error(`Google Ads query failed (${response.status}): ${codes.join(",")||failure?.message||failure?.status||"Unknown error"}`);}
  return result.flatMap(batch=>batch.results||[]);
 };
}

export async function exportCreatives({search,directory}) {
 const campaigns=await search("SELECT campaign.id,campaign.name FROM campaign WHERE campaign.name IN ('EM-Search-Nonbrand-Purchase-Apr26','EM-Search-Nonbrand-TIS-April26','EM-Search-Nonbrand-Competitor-IS-Jun25','EM-Search-Brand-Mar25','EM-Search-Brand-Mar25 Brand_AbsTopPageTest_2026/07')");
 const ids=campaigns.map(row=>row.campaign.id);if(ids.some(id=>!/^\d+$/.test(id))||!ids.length)throw Error("No matching campaigns");
 const scope=ids.join(",");
 const groups=await search(`SELECT campaign.id,ad_group.id,ad_group.name,ad_group.status FROM ad_group WHERE campaign.id IN (${scope}) AND ad_group.status IN ('ENABLED','PAUSED','REMOVED')`);
 const ads=await search(`SELECT campaign.id,ad_group.id,ad_group_ad.status,ad_group_ad.ad.id,ad_group_ad.ad.name,ad_group_ad.ad.type,ad_group_ad.ad.final_urls,ad_group_ad.ad.responsive_search_ad.headlines,ad_group_ad.ad.responsive_search_ad.descriptions,ad_group_ad.ad.responsive_search_ad.path1,ad_group_ad.ad.responsive_search_ad.path2 FROM ad_group_ad WHERE campaign.id IN (${scope}) AND ad_group_ad.status IN ('ENABLED','PAUSED','REMOVED')`);
 const assets=[];const warnings=[];
 for(const resource of ["campaign_asset","ad_group_asset"]){
  try {assets.push(...await search(`SELECT campaign.id,${resource==="ad_group_asset"?"ad_group.id,":""}${resource}.field_type,asset.id,asset.name,asset.type,asset.text_asset.text,asset.image_asset.full_size.url,asset.youtube_video_asset.youtube_video_id,asset.sitelink_asset.link_text,asset.sitelink_asset.description1,asset.sitelink_asset.description2,asset.final_urls,asset.callout_asset.callout_text FROM ${resource} WHERE campaign.id IN (${scope})`));}
  catch(error){warnings.push(`${resource}: ${error.message}`);}
 }
 await mkdir(directory,{recursive:true,mode:0o700});
 const mediaDirectory=path.join(directory,"media");await mkdir(mediaDirectory,{recursive:true,mode:0o700});
 const images=new Map();
 for(const item of assets){const asset=item.asset;if(!asset?.imageAsset?.fullSize?.url||images.has(asset.id))continue;
  const url=new URL(asset.imageAsset.fullSize.url);if(url.protocol!=="https:"||!(url.hostname.endsWith("googleusercontent.com")||url.hostname.endsWith("googlesyndication.com"))){warnings.push(`Image ${asset.id}: unrecognized image host`);continue;}
  try {const response=await fetch(url,{signal:AbortSignal.timeout(30000)});const mime=response.headers.get("content-type")||"";if(!response.ok||!/^image\/(jpeg|png|webp|gif)$/.test(mime))throw Error("Invalid image response");const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>20*1024*1024)throw Error("Image exceeds limit");await writeFile(path.join(mediaDirectory,asset.id),bytes,{mode:0o600});images.set(asset.id,mime);asset.localMediaPath=`/api/google/creative-media/${asset.id}`;asset.localMime=mime;}catch(error){warnings.push(`Image ${asset.id}: ${error.message}`);}
 }
 // Reuse downloaded media for repeated campaign/ad-group links.
 for(const item of assets){if(images.has(item.asset?.id)){item.asset.localMediaPath=`/api/google/creative-media/${item.asset.id}`;item.asset.localMime=images.get(item.asset.id);}}
 const archive={version:1,source:"Google Ads API v24",capturedAt:new Date().toISOString(),campaigns:campaigns.map(row=>row.campaign),groups,ads,assets,warnings};
 const filename=path.join(directory,"archive.json"),temporary=`${filename}.${process.pid}.tmp`;
 await writeFile(temporary,JSON.stringify(archive),{mode:0o600});await rename(temporary,filename);
 return {campaigns:campaigns.length,groups:groups.length,ads:ads.length,assets:assets.length,downloadedImages:images.size,warnings};
}

if(process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname){
 const {default:env}=await import("@next/env");env.loadEnvConfig(process.cwd());
 const directory=process.env.GOOGLE_ADS_CREATIVE_DIR||path.join(process.cwd(),".state/google-creatives");
 try {console.log(await exportCreatives({search:await googleAdsReader(),directory}));}catch(error){console.error(error.message);process.exitCode=1;}
}
