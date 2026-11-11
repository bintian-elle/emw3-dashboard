import "server-only";
import {readTestingDataSnapshot} from "@/lib/testing-data-cache";
import {connection} from "next/server";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {matchesInstagramPost,paidInstagramMetrics,type PaidInsight,type InstagramAdCreative} from "@/lib/instagram-paid-metrics";
import {instagramPostCodes,insightValues,socialMetrics,cachedInstagramPosts,type SocialPost,type MediaInsight} from "@/lib/instagram-posts";
import {fetchInstagramInsights,InstagramUnsupportedMetric,isInstagramUnsupportedMetric} from "@/lib/testing-social-insights";
import {isSocialSnapshot} from "@/lib/testing-social-snapshot";

type Snapshot={version?:number;capturedAt:string;posts:SocialPost[]};
export type SocialPerformance=Snapshot&{stale:boolean;error:boolean};
const filename=path.join(process.cwd(),".state/social/instagram-posts.json");
const ttl=6*3600000;
async function graph<T>(endpoint:string,params:Record<string,string>={}):Promise<T>{
 const token=process.env.META_ACCESS_TOKEN;if(!token)throw Error("Instagram credentials unavailable");
 const url=new URL(`https://graph.facebook.com/v25.0/${endpoint}`);
 for(const [key,value]of Object.entries({...params,access_token:token}))url.searchParams.set(key,value);
 const response=await fetch(url,{cache:"no-store",headers:{"Cache-Control":"no-cache"},signal:AbortSignal.timeout(20000)});
 const result=await response.json();if(!response.ok||result.error){const code=result.error?.code??response.status;if(response.status===429||[4,17,32,613].includes(code))throw Error("Instagram API rate limit (HTTP 429). Please try again later.");if(isInstagramUnsupportedMetric(code,result.error?.message))throw new InstagramUnsupportedMetric("Instagram metric is not supported.");throw Error(`Instagram API unavailable (${code})`);}
 return result as T;
}
function emptyPost(code:string):SocialPost{return {code,url:`https://www.instagram.com/p/${code}/`,caption:"",publishedAt:null,mediaType:null,thumbnailUrl:null,metrics:insightValues([]),status:"unavailable"};}
export async function readSocialLocalSnapshot():Promise<Snapshot|null>{try{return JSON.parse(await readFile(filename,"utf8"));}catch{return null;}}
export async function readSocialLocalPreview():Promise<Snapshot|null>{
 if(process.env.NODE_ENV==='production'&&process.env.LOCAL_PRODUCTION_PREVIEW!=='1')return null;
 try{const snapshot=JSON.parse(await readFile(path.join(process.cwd(),'.state/social/instagram-posts-preview.json'),"utf8"));return isSocialSnapshot(snapshot)&&typeof snapshot.capturedAt==='string'?snapshot as Snapshot:null;}catch{return null;}
}
async function refresh():Promise<SocialPerformance>{
  const posts:SocialPost[]=[];
  // The post identity and thumbnails are fixed locally; only metrics are refreshed.
  for(const item of cachedInstagramPosts){
   if(!item.id)throw Error("Instagram post identity is unavailable locally");
   const metrics=item.mediaType==="Reel"?socialMetrics.filter(metric=>metric!=="follows"):socialMetrics;
   const values=await fetchInstagramInsights(metrics,async metric=>(await graph<{data:MediaInsight[]}>(`${item.id}/insights`,{metric})).data);
   if(!values.length)throw Error("Instagram post insights are unavailable");
   const parsed=insightValues(values);
   posts.push({...item,metrics:parsed,status:socialMetrics.every(metric=>parsed[metric]!=null)?"available":values.length?"partial":"unavailable"});
  }
  if(posts.every(post=>post.status==="unavailable"))throw Error("Instagram post insights unavailable");
  await addPaidPerformance(posts);
  const result={version:2,capturedAt:new Date().toISOString(),posts};
  return {...result,stale:false,error:false};
}
export async function fetchFreshSocialPerformance():Promise<SocialPerformance>{
 await connection();return refresh();
}
export async function getSocialPerformance():Promise<SocialPerformance>{
 await connection();
 const published=await readTestingDataSnapshot<SocialPerformance>("social");
 const localPreview=await readSocialLocalPreview();
 if(localPreview&&Date.parse(localPreview.capturedAt)>Date.parse(published?.payload?.capturedAt??'1970-01-01'))return withSelectedPosts({...localPreview,stale:false,error:false});
 if(isSocialSnapshot(published?.payload))return withSelectedPosts(published!.payload);
 const cached=await readSocialLocalSnapshot();
 if(isSocialSnapshot(cached)){
  const stale=!Number.isFinite(Date.parse(cached.capturedAt))||Date.now()-Date.parse(cached.capturedAt)>=ttl;
  return withSelectedPosts({...cached,stale,error:false});
 }
 return {capturedAt:"",posts:instagramPostCodes.map(emptyPost),stale:false,error:true};
}
function withSelectedPosts(snapshot:SocialPerformance):SocialPerformance{
 const byCode=new Map(snapshot.posts.map(post=>[post.code,post]));
 return {...snapshot,posts:instagramPostCodes.map(code=>byCode.get(code)??emptyPost(code))};
}

async function adCreatives(ids:string[]){
 const result:Array<{id:string;creative?:InstagramAdCreative}>=[];
 for(let i=0;i<ids.length;i+=50){
  const batch=ids.slice(i,i+50).map(id=>({method:"GET",relative_url:`${id}?fields=id,creative{source_instagram_media_id,effective_instagram_media_id,instagram_permalink_url}`}));
  const response=await fetch("https://graph.facebook.com/v25.0/",{method:"POST",body:new URLSearchParams({access_token:process.env.META_ACCESS_TOKEN!,batch:JSON.stringify(batch)}),cache:"no-store",signal:AbortSignal.timeout(30000)});
  const data=await response.json();if(response.status===429||[4,17,32,613].includes(data?.error?.code))throw Error("Instagram API rate limit (HTTP 429). Please try again later.");if(!response.ok||!Array.isArray(data))throw Error("Instagram ad metadata unavailable");
  for(const item of data){const row=JSON.parse(item.body);if(item.code===429||[4,17,32,613].includes(row.error?.code))throw Error("Instagram API rate limit (HTTP 429). Please try again later.");if(item.code!==200||row.error)throw Error("Instagram ad metadata unavailable");result.push(row);}
 }
 return result;
}
/** Ads Insights can provide bounded Paid metrics. Media Insights remains cumulative. */
export async function fetchSocialPaidForPeriod(posts:SocialPost[],period:{start:string;end:string}){
 const eligible=posts.filter(post=>post.publishedAt&&post.publishedAt.slice(0,10)<=period.end).map(post=>({...post}));
 if(eligible.length)await addPaidPerformance(eligible,period);
 return eligible.map(({code,url,paid})=>({code,url,paid}));
}

async function addPaidPerformance(posts:SocialPost[],period?:{start:string;end:string}){
 const account=process.env.META_AD_ACCOUNT_ID?.replace(/^act_/,"");if(!account||!/^\d+$/.test(account))throw Error("Instagram ad account unavailable");
 const since=period?.start??posts.flatMap(post=>post.publishedAt?[post.publishedAt.slice(0,10)]:[]).sort()[0];if(!since)throw Error("Instagram publication dates unavailable");
 const until=period?.end??new Date().toISOString().slice(0,10),time_range=JSON.stringify({since,until});
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
  if(!linked.length){post.paid={metrics:{views:0,reach:0,likes:0,comments:0,shares:0,saved:0,follows:0},adCount:0,status:"available"};continue;}
  // Meta deduplicates reach across all ads for this post; never add ad-level reach values.
  const result=await graph<{data:PaidInsight[]}>(`act_${account}/insights`,{fields:"impressions,reach,actions,video_play_actions,instagram_profile_follow",time_range:JSON.stringify({since:period?.start??post.publishedAt?.slice(0,10)??since,until}),filtering:JSON.stringify([platform,{field:"ad.id",operator:"IN",value:linked.map(ad=>ad.id)}])});
  post.paid={metrics:paidInstagramMetrics(result.data[0]??{},post.mediaType==="Reel"||post.mediaType==="Video"),adCount:linked.length,status:"available"};
 }
}
