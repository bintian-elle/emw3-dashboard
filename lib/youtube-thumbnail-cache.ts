import {mkdir,readFile,writeFile,rename} from "node:fs/promises";
import path from "node:path";
const pending=new Map<string,Promise<Buffer>>();
export async function readYoutubeThumbnail(video:string):Promise<Buffer>{
 if(!/^[a-zA-Z0-9_-]{11}$/.test(video))throw Error("Invalid YouTube video ID");
 const directory=path.join(process.env.GOOGLE_ADS_CREATIVE_DIR||path.join(process.cwd(),".state/google-creatives"),"youtube-thumbnails"),file=path.join(directory,`${video}.jpg`);
 try{return await readFile(file);}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
 const existing=pending.get(file);if(existing)return existing;
 const request=(async()=>{const response=await fetch(`https://img.youtube.com/vi/${video}/mqdefault.jpg`,{cache:"no-store",signal:AbortSignal.timeout(10000),redirect:"error"});if(!response.ok||!response.headers.get("content-type")?.startsWith("image/jpeg"))throw Error("Video thumbnail unavailable");const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>512000||bytes[0]!==0xff||bytes[1]!==0xd8)throw Error("Invalid thumbnail image");await mkdir(directory,{recursive:true,mode:0o700});const temp=`${file}.${process.pid}.tmp`;await writeFile(temp,bytes,{mode:0o600});await rename(temp,file);return bytes;})();pending.set(file,request);try{return await request;}finally{pending.delete(file);}
}
