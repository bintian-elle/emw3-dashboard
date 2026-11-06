import {currentSiteUser} from '@/lib/current-site-user';
import {readStoredMedia} from '@/lib/testing-report-store.server';
export async function GET(_request:Request,{params}:{params:Promise<{run:string;key:string}>}){
 if(!await currentSiteUser())return new Response(null,{status:401});
 const {run,key}=await params;
 if(!/^[a-z0-9-]{1,100}$/.test(run)||!/^[a-zA-Z0-9-]{1,100}$/.test(key))return new Response(null,{status:404});
 const media=await readStoredMedia(run,key);
 return media?new Response(new Uint8Array(media.body),{headers:{'Content-Type':media.mime_type,'Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}}):new Response(null,{status:404});
}
