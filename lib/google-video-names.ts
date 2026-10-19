import "server-only";
import {mkdir,readFile,writeFile,rename} from "node:fs/promises";
import path from "node:path";
import {queryGoogleTestingApi} from "@/lib/google-testing-api";
type VideoAsset={id:string;name?:string;youtubeVideoAsset?:{youtubeVideoId:string;youtubeVideoTitle?:string}};
let writes:Promise<void>=Promise.resolve();
const pending=new Map<string,Promise<Record<string,string>>>();
export async function googleVideoNames(assets:VideoAsset[]):Promise<Record<string,string>>{
 const videos=[...new Map(assets.filter(a=>a.youtubeVideoAsset).map(a=>[a.id,a])).values()];if(!videos.length)return {};
 const directory=process.env.GOOGLE_ADS_CREATIVE_DIR||path.join(process.cwd(),".state/google-creatives"),file=path.join(directory,"youtube-video-names.json");
 let titles:Record<string,string>={};try{titles=JSON.parse(await readFile(file,"utf8"));}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
 for(const asset of videos)if(asset.youtubeVideoAsset?.youtubeVideoTitle)titles[asset.id]=asset.youtubeVideoAsset.youtubeVideoTitle;
 const missing=videos.filter(asset=>titles[asset.id]===undefined);if(!missing.length)return titles;
 const ids=missing.map(a=>a.id).sort();if(ids.some(id=>!/^\d+$/.test(id)))throw Error("Invalid video asset ID");
 const key=ids.join(",");const existing=pending.get(key);if(existing)return {...titles,...await existing};
 const request=(async()=>{const rows=await queryGoogleTestingApi<{asset:VideoAsset}>(`SELECT asset.id,asset.youtube_video_asset.youtube_video_title FROM asset WHERE asset.id IN (${key})`);const found=Object.fromEntries(ids.map(id=>[id,rows.find(r=>r.asset.id===id)?.asset.youtubeVideoAsset?.youtubeVideoTitle??""]));
  // Merge the latest file so simultaneous PMax and Demand Gen discoveries retain both sets.
  const write=writes.then(async()=>{let latest:Record<string,string>={};try{latest=JSON.parse(await readFile(file,"utf8"));}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
  const result={...latest,...titles,...found};await mkdir(directory,{recursive:true,mode:0o700});const temp=`${file}.${process.pid}.${crypto.randomUUID()}.tmp`;await writeFile(temp,JSON.stringify(result),{mode:0o600});await rename(temp,file);return result;});writes=write.then(()=>{},()=>{});return write;
 })();pending.set(key,request);try{return await request;}finally{pending.delete(key);}
}
