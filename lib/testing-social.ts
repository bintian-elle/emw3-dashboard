import "server-only";
import {after,connection} from "next/server";
import {mkdir,readFile,writeFile,rename} from "node:fs/promises";
import path from "node:path";
import {matchesInstagramPost,paidInstagramMetrics,type PaidInsight,type InstagramAdCreative} from "@/lib/instagram-paid-metrics";
import {instagramPostCodes,insightValues,socialMetrics,type SocialPost,type MediaInsight} from "@/lib/instagram-posts";

type Media={id:string;permalink:string;caption?:string;timestamp:string;media_type:string;media_product_type?:string;media_url?:string;thumbnail_url?:string};
type Snapshot={version?:number;capturedAt:string;posts:SocialPost[]};
export type SocialPerformance=Snapshot&{stale:boolean;error:boolean};
const filename=path.join(process.cwd(),".state/social/instagram-posts.json");
const ttl=6*3600000;
declare global{var emw3SocialRequest:Promise<SocialPerformance>|undefined;}
async function graph<T>(endpoint:string,params:Record<string,string>={}):Promise<T>{
 const token=process.env.META_ACCESS_TOKEN;if(!token)throw Error("Instagram credentials unavailable");
 const url=new URL(`https://graph.facebook.com/v25.0/${endpoint}`);
 for(const [key,value]of Object.entries({...params,access_token:token}))url.searchParams.set(key,value);
 const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(20000)});
 const result=await response.json();if(!response.ok||result.error)throw Error(`Instagram API unavailable (${result.error?.code??response.status})`);
 return result as T;
}
function emptyPost(code:string):SocialPost{return {code,url:`https://www.instagram.com/p/${code}/`,caption:"",publishedAt:null,mediaType:null,thumbnailUrl:null,metrics:insightValues([]),status:"unavailable"};}
async function snapshot():Promise<Snapshot|null>{try{return JSON.parse(await readFile(filename,"utf8"));}catch{return null;}}
async function refresh(cached:Snapshot|null):Promise<SocialPerformance>{
 try{
  const pages=await graph<{data:Array<{instagram_business_account?:{id:string;username:string}}>}>('me/accounts',{fields:'instagram_business_account{id,username}',limit:'100'});
  const account=pages.data.find(page=>page.instagram_business_account?.username.toLowerCase()==="bluevua")?.instagram_business_account;
  if(!account)throw Error("Bluevua Instagram account unavailable");
  const media=new Map<string,Media>();let after:string|undefined;
  // Stop immediately once the explicit post selection is found. Never load account insights.
  for(let page=0;page<15;page++){
   const result=await graph<{data:Media[];paging?:{next?:string;cursors:{after:string}}}>(`${account.id}/media`,{fields:"id,permalink,caption,timestamp,media_type,media_product_type,media_url,thumbnail_url",limit:"100",...(after?{after}:{})});
   for(const row of result.data){const code=instagramPostCodes.find(value=>row.permalink.includes(`/${value}/`));if(code)media.set(code,row);}
   if(media.size===instagramPostCodes.length||!result.paging?.next)break;after=result.paging.cursors.after;
  }
  const posts:SocialPost[]=[];
  // Sequential requests keep the Insights request rate bounded; each combines supported metrics.
  for(const code of instagramPostCodes){
   const item=media.get(code);if(!item){posts.push(emptyPost(code));continue;}
   const metrics=item.media_product_type==="REELS"?socialMetrics.filter(metric=>metric!=="follows"):socialMetrics;
   let values:MediaInsight[]=[];
   try{values=(await graph<{data:MediaInsight[]}>(`${item.id}/insights`,{metric:metrics.join(",")})).data;}catch{
    // One unsupported metric must not hide the other valid metrics.
    for(const metric of metrics){try{values.push(...(await graph<{data:MediaInsight[]}>(`${item.id}/insights`,{metric})).data);}catch{/* Missing values remain null. */}}
   }
   const parsed=insightValues(values);
   posts.push({code,id:item.id,url:item.permalink,caption:item.caption??"",publishedAt:item.timestamp,mediaType:item.media_product_type==="REELS"?"Reel":item.media_type==="CAROUSEL_ALBUM"?"Carousel":item.media_type==="VIDEO"?"Video":"Image",thumbnailUrl:item.thumbnail_url??(item.media_type==="VIDEO"?null:item.media_url)??null,metrics:parsed,status:socialMetrics.every(metric=>parsed[metric]!=null)?"available":values.length?"partial":"unavailable"});
  }
  if(posts.every(post=>post.status==="unavailable"))throw Error("Instagram post insights unavailable");
  await addPaidPerformance(posts);
  const result={version:2,capturedAt:new Date().toISOString(),posts};
  await mkdir(path.dirname(filename),{recursive:true,mode:0o700});const tmp=`${filename}.${process.pid}.tmp`;await writeFile(tmp,JSON.stringify(result),{mode:0o600});await rename(tmp,filename);
  return {...result,stale:false,error:false};
 }catch{return {capturedAt:cached?.capturedAt??"",posts:cached?.posts??instagramPostCodes.map(emptyPost),stale:!!cached,error:true};}
}
function refreshOnce(cached:Snapshot|null):Promise<SocialPerformance>{
 if(globalThis.emw3SocialRequest)return globalThis.emw3SocialRequest;
 const request=refresh(cached);
 globalThis.emw3SocialRequest=request;
 // Also back off failed refreshes, rather than repeating the API scan on every visit.
 void request.finally(()=>{setTimeout(()=>{if(globalThis.emw3SocialRequest===request)globalThis.emw3SocialRequest=undefined;},60000).unref();});
 return request;
}
export async function getSocialPerformance():Promise<SocialPerformance>{
 await connection();
 const cached=await snapshot();
 if(cached?.version===2&&Array.isArray(cached.posts)&&cached.posts.length){
  const stale=!Number.isFinite(Date.parse(cached.capturedAt))||Date.now()-Date.parse(cached.capturedAt)>=ttl;
  // Rendering never waits for an expired snapshot to refresh, even if another
  // request already started that refresh. after keeps the work alive on the server.
  if(stale)after(async()=>{await refreshOnce(cached);});
  return {...cached,stale,error:false};
 }
 return refreshOnce(cached);
}

async function adCreatives(ids:string[]){
 const result:Array<{id:string;creative?:InstagramAdCreative}>=[];
 for(let i=0;i<ids.length;i+=50){
  const batch=ids.slice(i,i+50).map(id=>({method:"GET",relative_url:`${id}?fields=id,creative{source_instagram_media_id,effective_instagram_media_id,instagram_permalink_url}`}));
  const response=await fetch("https://graph.facebook.com/v25.0/",{method:"POST",body:new URLSearchParams({access_token:process.env.META_ACCESS_TOKEN!,batch:JSON.stringify(batch)}),cache:"no-store",signal:AbortSignal.timeout(30000)});
  const data=await response.json();if(!response.ok||!Array.isArray(data))throw Error("Instagram ad metadata unavailable");
  for(const item of data){if(item.code!==200)throw Error("Instagram ad metadata unavailable");const row=JSON.parse(item.body);if(row.error)throw Error("Instagram ad metadata unavailable");result.push(row);}
 }
 return result;
}
async function addPaidPerformance(posts:SocialPost[]){
 const account=process.env.META_AD_ACCOUNT_ID?.replace(/^act_/,"");if(!account||!/^\d+$/.test(account))throw Error("Instagram ad account unavailable");
 const since=posts.flatMap(post=>post.publishedAt?[post.publishedAt.slice(0,10)]:[]).sort()[0];if(!since)throw Error("Instagram publication dates unavailable");
 const until=new Date().toISOString().slice(0,10),time_range=JSON.stringify({since,until});
 const platform={field:"publisher_platform",operator:"IN",value:["instagram"]};
 const ids=new Set<string>();let after:string|undefined;
 // Start with delivered ads, including paused ads, rather than scanning every creative in the account.
 do{
  const result=await graph<{data:PaidInsight[];paging?:{next?:string;cursors:{after:string}}}>(`act_${account}/insights`,{fields:"ad_id",level:"ad",time_range,filtering:JSON.stringify([platform]),limit:"500",...(after?{after}:{})});
  for(const row of result.data)if(row.ad_id)ids.add(row.ad_id);
  after=result.paging?.next?result.paging.cursors.after:undefined;
 }while(after);
 const ads=await adCreatives([...ids]);
 for(const post of posts){
  const linked=ads.filter(ad=>ad.creative&&matchesInstagramPost(post,ad.creative));
  if(!linked.length){post.paid={metrics:{views:0,reach:0,likes:0,comments:0,shares:0,saved:0,follows:null},adCount:0,status:"available"};continue;}
  // Meta deduplicates reach across all ads for this post; never add ad-level reach values.
  const result=await graph<{data:PaidInsight[]}>(`act_${account}/insights`,{fields:"impressions,reach,actions,video_play_actions",time_range:JSON.stringify({since:post.publishedAt?.slice(0,10)??since,until}),filtering:JSON.stringify([platform,{field:"ad.id",operator:"IN",value:linked.map(ad=>ad.id)}])});
  post.paid={metrics:paidInstagramMetrics(result.data[0]??{},post.mediaType==="Reel"||post.mediaType==="Video"),adCount:linked.length,status:"available"};
 }
}
