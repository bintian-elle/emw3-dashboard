import {readYoutubeThumbnail} from "@/lib/youtube-thumbnail-cache";
export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{video:string}>}){
 const {video}=await params;if(!/^[a-zA-Z0-9_-]{11}$/.test(video))return new Response(null,{status:404});
 try{const bytes=await readYoutubeThumbnail(video);return new Response(new Uint8Array(bytes),{headers:{"Content-Type":"image/jpeg","Cache-Control":"private, max-age=2592000, immutable","X-Content-Type-Options":"nosniff"}});}catch{return new Response(null,{status:404,headers:{"Cache-Control":"private, max-age=300"}});}
}
