import "server-only";
import {mkdir,readFile,writeFile,rename} from "node:fs/promises";
import path from "node:path";
import {queryGoogleTestingApi,readGoogleSearchSharedSnapshot} from "@/lib/google-testing-api";
import type {CreativeArchive} from "@/lib/google-creative-archive";
export const GOOGLE_CONTENT_TEST_LABEL="EM_Oct26_ContentTesting";
export const GOOGLE_CONTENT_CAMPAIGNS=["EM-Search-Nonbrand-Purchase-Apr26","EM-Search-Nonbrand-TIS-April26","EM-Search-Nonbrand-Competitor-IS-Jun25"] as const;
export type ContentTestingAd=CreativeArchive["ads"][number]&{campaign:{id:string;name:string;status:string};adGroup:{id:string;name:string};adGroupAd:CreativeArchive["ads"][number]["adGroupAd"]&{labels?:string[]}};
export type GoogleContentTestingInventory={version:1;capturedAt:number;label:string;labelResource:string;ads:ContentTestingAd[]};
declare global{var emw3GoogleContentInventory:Promise<GoogleContentTestingInventory>|undefined;}
export async function googleContentTestingInventory():Promise<GoogleContentTestingInventory>{
 const shared=await readGoogleSearchSharedSnapshot();if(shared)return shared.inventory;
 if(globalThis.emw3GoogleContentInventory)return globalThis.emw3GoogleContentInventory;
 const request=load();globalThis.emw3GoogleContentInventory=request;
 void request.finally(()=>{setTimeout(()=>{if(globalThis.emw3GoogleContentInventory===request)globalThis.emw3GoogleContentInventory=undefined;},60000).unref();}).catch(()=>{});
 return request;
}
async function load():Promise<GoogleContentTestingInventory>{
 const directory=process.env.GOOGLE_ADS_CREATIVE_DIR||path.join(process.cwd(),".state/google-creatives");
 const filename=path.join(directory,"content-testing-inventory.json");
 try{const cached=JSON.parse(await readFile(filename,"utf8")) as GoogleContentTestingInventory;if(cached.version===1&&cached.label===GOOGLE_CONTENT_TEST_LABEL&&Date.now()-cached.capturedAt<6*3600000)return cached;}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
 const result=await fetchFreshGoogleContentInventory();
 await mkdir(directory,{recursive:true,mode:0o700});const temp=`${filename}.${process.pid}.tmp`;await writeFile(temp,JSON.stringify(result),{mode:0o600});await rename(temp,filename);return result;
}
/** Fetch the complete inventory without mutating existing cache files or process state. */
export async function fetchFreshGoogleContentInventory():Promise<GoogleContentTestingInventory>{
 const labels=await queryGoogleTestingApi<{label:{resourceName:string}}>(`SELECT label.resource_name FROM label WHERE label.name = '${GOOGLE_CONTENT_TEST_LABEL}'`);
 const resource=labels[0]?.label.resourceName;if(!resource)throw Error("Google content-testing label is unavailable");
 const names=GOOGLE_CONTENT_CAMPAIGNS.map(name=>`'${name}'`).join(",");
 const ads=await queryGoogleTestingApi<ContentTestingAd>(`SELECT campaign.id,campaign.name,campaign.status,ad_group.id,ad_group.name,ad_group_ad.status,ad_group_ad.labels,ad_group_ad.ad.id,ad_group_ad.ad.name,ad_group_ad.ad.type,ad_group_ad.ad.final_urls,ad_group_ad.ad.responsive_search_ad.headlines,ad_group_ad.ad.responsive_search_ad.descriptions,ad_group_ad.ad.responsive_search_ad.path1,ad_group_ad.ad.responsive_search_ad.path2 FROM ad_group_ad WHERE campaign.name IN (${names}) AND ad_group_ad.labels CONTAINS ANY ('${resource}') AND ad_group_ad.status IN ('ENABLED','PAUSED','REMOVED')`);
 const result:GoogleContentTestingInventory={version:1,capturedAt:Date.now(),label:GOOGLE_CONTENT_TEST_LABEL,labelResource:resource,ads};
 return result;
}
