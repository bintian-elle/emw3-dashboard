import "server-only";
import {connection} from "next/server";
import {mkdir,readFile,writeFile,rename} from "node:fs/promises";
import path from "node:path";
import {instagramPostCodes,insightValues,socialMetrics,type SocialPost,type MediaInsight} from "@/lib/instagram-posts";

type Media={id:string;permalink:string;caption?:string;timestamp:string;media_type:string;media_product_type?:string;media_url?:string;thumbnail_url?:string};
type Snapshot={capturedAt:string;posts:SocialPost[]};
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
  const result={capturedAt:new Date().toISOString(),posts};
  await mkdir(path.dirname(filename),{recursive:true,mode:0o700});const tmp=`${filename}.${process.pid}.tmp`;await writeFile(tmp,JSON.stringify(result),{mode:0o600});await rename(tmp,filename);
  return {...result,stale:false,error:false};
 }catch{return {capturedAt:cached?.capturedAt??"",posts:cached?.posts??instagramPostCodes.map(emptyPost),stale:!!cached,error:true};}
}
export async function getSocialPerformance():Promise<SocialPerformance>{
 await connection();
 if(globalThis.emw3SocialRequest)return globalThis.emw3SocialRequest;
 const request=(async()=>{const cached=await snapshot();if(cached&&Date.now()-Date.parse(cached.capturedAt)<ttl)return {...cached,stale:false,error:false};return refresh(cached);})();
 globalThis.emw3SocialRequest=request;
 void request.finally(()=>{setTimeout(()=>{if(globalThis.emw3SocialRequest===request)globalThis.emw3SocialRequest=undefined;},60000).unref();});
 return request;
}
