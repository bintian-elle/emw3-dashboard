import {readFile} from "node:fs/promises";
import path from "node:path";
import {creativeArchiveDirectory,readGoogleCreativeArchive} from "@/lib/google-creative-archive";
export async function GET(_request:Request,{params}:{params:Promise<{asset:string}>}){
 const {asset}=await params;if(!/^\d+$/.test(asset))return new Response(null,{status:404});
 const archive=await readGoogleCreativeArchive();const metadata=archive?.assets.find(row=>row.asset.id===asset&&row.asset.localMime)?.asset;if(!metadata)return new Response(null,{status:404});
 try{const bytes=await readFile(path.join(creativeArchiveDirectory(),"media",asset));return new Response(bytes,{headers:{"Content-Type":metadata.localMime!,"Cache-Control":"private, max-age=86400","X-Content-Type-Options":"nosniff"}});}catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return new Response(null,{status:404});throw error;}
}
