import {currentSiteUser} from '@/lib/current-site-user';
import {readNoteImage} from '@/lib/staging-notes';
import {join} from 'node:path';
export const runtime='nodejs';
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
 if(process.env.DEPLOYMENT_ENV!=='staging')return new Response(null,{status:404,headers});
 if(!await currentSiteUser())return new Response(null,{status:401,headers});
 try{const image=await readNoteImage(process.env.STAGING_NOTES_DIR||join(process.cwd(),'.state','staging-notes'),new URL(request.url).searchParams.get('id')||'');return new Response(new Uint8Array(image),{headers:{...headers,'Content-Type':'image/webp','Content-Length':String(image.length)}});}
 catch{return new Response(null,{status:404,headers});}
}
