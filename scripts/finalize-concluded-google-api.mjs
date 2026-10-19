import {readFile,writeFile,mkdir,rename,copyFile,open,unlink} from "node:fs/promises";
import path from "node:path";
import {googleAdsReader} from "./google-ads-creatives.mjs";
import {finalizationDate} from "./concluded-test-snapshots.mjs";
const zero=()=>({spend:0,revenue:0,orders:0,impressions:0,clicks:0});
const metric=row=>({spend:Number(row.metrics?.costMicros??0)/1e6,revenue:Number(row.metrics?.conversionsValue??0),orders:Number(row.metrics?.conversions??0),impressions:Number(row.metrics?.impressions??0),clicks:Number(row.metrics?.clicks??0)});
const sum=rows=>rows.reduce((total,row)=>{for(const key of Object.keys(total))total[key]+=row[key];return total;},zero());
const ratios=m=>{const ratio=(a,b)=>b>0?a/b:null;return {...m,cpa:ratio(m.spend,m.orders),cvr:ratio(m.orders,m.clicks),roas:ratio(m.revenue,m.spend),ctr:ratio(m.clicks,m.impressions),cpc:ratio(m.spend,m.clicks)};};
export function validateAdTotals(campaignRows,adRows,campaignIds){
 for(const id of campaignIds){
  const a=sum(campaignRows.filter(row=>row.campaign.id===id).map(metric)),b=sum(adRows.filter(row=>row.campaign.id===id).map(metric));
  for(const key of Object.keys(a)){const tolerance=["spend","revenue"].includes(key)?0.02:key==="orders"?0.01:0;if(Math.abs(a[key]-b[key])>tolerance)throw Error(`Campaign/ad totals differ for ${id}: ${key} (${a[key]} vs ${b[key]})`);}
 }
}
export async function readFrozenAds(directory){
 const {readdir}=await import("node:fs/promises");const folder=path.join(directory,"frozen-experiments");
 let files;try{files=await readdir(folder);}catch(error){if(error.code==="ENOENT")return [];throw error;}
 const result=[];for(const file of files.filter(file=>file.endsWith(".json"))){const item=JSON.parse(await readFile(path.join(folder,file),"utf8"));if(item.finalized!==true||!Array.isArray(item.campaignIds)||!Array.isArray(item.days)||item.campaignIds.some(id=>!/^\d+$/.test(id)))throw Error("Invalid frozen experiment ad performance");result.push(item);}return result;
}
export async function finalizeConcludedGoogleApi({test,directory,creativeDirectory,search,now=new Date()}){
 if(!/^[a-z0-9-]+$/.test(test.id)||!/^\d+$/.test(test.experimentId??""))throw Error("Invalid concluded experiment");
 const filename=path.join(directory,`${test.id}.json`);await mkdir(directory,{recursive:true,mode:0o700});
 const lockFile=`${filename}.lock`;const lock=await open(lockFile,"wx",0o600);
 try{
  const old=JSON.parse(await readFile(filename,"utf8"));if(old.finalized)return {status:"already frozen",testId:test.id};
  const existingReport=JSON.parse(await readFile(path.join(creativeDirectory,"ad-performance.json"),"utf8"));if(!Array.isArray(existingReport.days))throw Error("Existing ad performance is unavailable");
  const customer=(process.env.GOOGLE_ADS_CUSTOMER_ID??"2952222550").replaceAll("-","");if(!/^\d+$/.test(customer))throw Error("Invalid customer ID");
  const resource=`customers/${customer}/experiments/${test.experimentId}`;
  const metadata=await search(`SELECT experiment.resource_name,experiment.name,experiment.start_date,experiment.end_date,experiment.status FROM experiment WHERE experiment.resource_name='${resource}'`);
  const experiment=metadata[0]?.experiment;if(!experiment||!["HALTED","ENDED","PROMOTED"].includes(experiment.status))throw Error("Experiment is not concluded");
  const period={start:experiment.startDate,end:experiment.endDate};if(!/^\d{4}-\d{2}-\d{2}$/.test(period.start)||!/^\d{4}-\d{2}-\d{2}$/.test(period.end)||period.start>period.end||period.start!==test.lifetime?.start||period.end!==test.lifetime?.end)throw Error("Experiment lifetime differs from confirmed test");
  const due=finalizationDate(period.end);if(now<new Date(due))throw Error("Final attribution wait has not elapsed");
  const arms=(await search(`SELECT experiment_arm.resource_name,experiment_arm.name,experiment_arm.control,experiment_arm.campaigns,experiment_arm.experiment FROM experiment_arm WHERE experiment_arm.experiment='${resource}'`)).map(row=>row.experimentArm).sort((a,b)=>Number(!!a.control)-Number(!!b.control));
  if(arms.length!==2||arms.filter(arm=>arm.control).length!==1||arms.some(arm=>arm.campaigns?.length!==1))throw Error("Expected exactly one treatment and one control campaign");
  const campaignIds=arms.flatMap(arm=>arm.campaigns.map(resource=>resource.split("/").at(-1)));if(new Set(campaignIds).size!==2||campaignIds.some(id=>!/^\d+$/.test(id)))throw Error("Invalid experiment campaigns");
  const fields="segments.date,metrics.cost_micros,metrics.conversions_value,metrics.conversions,metrics.impressions,metrics.clicks";
  const where=`campaign.id IN (${campaignIds.join(",")}) AND segments.date BETWEEN '${period.start}' AND '${period.end}'`;
  const campaignRows=await search(`SELECT campaign.id,campaign.name,${fields} FROM campaign WHERE ${where}`);
  const adRows=await search(`SELECT campaign.id,ad_group.id,ad_group_ad.ad.id,${fields} FROM ad_group_ad WHERE ${where} AND ad_group_ad.status IN ('ENABLED','PAUSED','REMOVED')`);
  if(campaignIds.some(id=>!campaignRows.some(row=>row.campaign.id===id)||!adRows.some(row=>row.campaign.id===id)))throw Error("Incomplete experiment performance");
  validateAdTotals(campaignRows,adRows,campaignIds);
  const dates=[];for(let day=period.start;day<=period.end;){dates.push(day);const date=new Date(`${day}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+1);day=date.toISOString().slice(0,10);}
  const groups=arms.map((arm,index)=>{const id=campaignIds[index],rows=campaignRows.filter(row=>row.campaign.id===id);return {label:index===0?"Group A":"Group B",name:`${arm.control?"Control":"Test"} · ${rows[0].campaign.name}`,adGroupId:arm.resourceName.split("/").at(-1),...ratios(sum(rows.map(metric)))};});
  const stamp=now.toISOString();const snapshot={...old,version:1,finalized:true,finalizedAt:stamp,capturedAt:stamp,apiFetchedAt:stamp,sourceUpdatedAt:null,finalizationDueAt:due,source:"Google Ads API v24",campaignIds,apiEvidence:{experiment,arms},dailyGroups:groups.map((group,index)=>({label:group.label,name:group.name,adGroupId:group.adGroupId,days:dates.map(date=>({date,...sum(campaignRows.filter(row=>row.campaign.id===campaignIds[index]&&row.segments.date===date).map(metric))}))})),report:{...old.report,campaignName:test.campaignName,campaignStatus:"Concluded",periodLabel:"Test lifetime",period,groups}};
  const days=adRows.map(row=>({campaignId:row.campaign.id,groupId:row.adGroup.id,adId:row.adGroupAd.ad.id,date:row.segments.date,...metric(row)}));
  const frozen={version:1,finalized:true,testId:test.id,capturedAt:stamp,source:"Google Ads API v24",campaignIds,range:period,days};
  const backup=path.join(directory,"backups",`${test.id}-${stamp.replaceAll(":","-")}`);await mkdir(backup,{recursive:true,mode:0o700});await copyFile(filename,path.join(backup,"previous-snapshot.json"));await copyFile(path.join(creativeDirectory,"ad-performance.json"),path.join(backup,"previous-ad-performance.json"));
  const frozenDirectory=path.join(creativeDirectory,"frozen-experiments");await mkdir(frozenDirectory,{recursive:true,mode:0o700});
  const write=async(file,data)=>{const temp=`${file}.${process.pid}.tmp`;await writeFile(temp,JSON.stringify(data),{mode:0o600});await rename(temp,file);};
  await write(path.join(frozenDirectory,`${test.id}.json`),frozen);
  // Existing pages read this archive. Pin all experiment ad rows to the same API snapshot.
  await write(path.join(creativeDirectory,"ad-performance.json"),{...existingReport,frozenTests:{...existingReport.frozenTests,[test.id]:stamp},days:[...existingReport.days.filter(row=>!campaignIds.includes(row.campaignId)),...days]});
  await write(filename,snapshot);
  return {status:"frozen",testId:test.id,period,capturedAt:stamp,dailyCampaignRows:campaignRows.length,adRows:days.length,groups:groups.map(group=>({label:group.label,spend:group.spend,revenue:group.revenue,orders:group.orders,roas:group.roas})),backup};
 }finally{await lock.close();await unlink(lockFile);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname){
 const {default:env}=await import("@next/env");env.loadEnvConfig(process.cwd());
 try{const id=process.argv[2];const definitions=JSON.parse(await readFile(path.join(process.cwd(),"config/concluded-tests.json"),"utf8"));const test=definitions.find(test=>test.id===id);if(!test)throw Error("Unknown concluded test");console.log(JSON.stringify(await finalizeConcludedGoogleApi({test,directory:process.env.CONCLUDED_TEST_SNAPSHOT_DIR||path.join(process.cwd(),".state/concluded-tests"),creativeDirectory:process.env.GOOGLE_ADS_CREATIVE_DIR||path.join(process.cwd(),".state/google-creatives"),search:await googleAdsReader()}),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
}
