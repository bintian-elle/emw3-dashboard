import {currentSiteUser} from '@/lib/current-site-user';
import {isReviewPreview} from '@/lib/review-preview.server';
import {readNoteImage} from '@/lib/staging-notes';
import {join} from 'node:path';
export const runtime='nodejs';
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
 const user=await currentSiteUser();if(!user)return new Response(null,{status:401,headers});
 if(!await isReviewPreview())return new Response(null,{status:403,headers});
 try{const image=await readNoteImage(process.env.REVIEW_NOTES_DIR||process.env.STAGING_NOTES_DIR||join(process.cwd(),'.state','review-notes'),new URL(request.url).searchParams.get('id')||'');return new Response(new Uint8Array(image),{headers:{...headers,'Content-Type':'image/webp','Content-Length':String(image.length)}});}
 catch{return new Response(null,{status:404,headers});}
}
