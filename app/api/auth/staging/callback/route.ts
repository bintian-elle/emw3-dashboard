import {NextRequest,NextResponse} from 'next/server';
import {join} from 'node:path';
import {consumeStagingTicket,STAGING_ORIGIN} from '@/lib/staging-access';
import {SESSION_COOKIE,SESSION_MAX_AGE,signAuthPayload,authCookieOptions} from '@/lib/site-auth';
export async function GET(request:NextRequest){
 if(process.env.DEPLOYMENT_ENV!=='staging')return new NextResponse('Not found',{status:404});
 try{
 const result=await consumeStagingTicket(request.nextUrl.searchParams.get('ticket')||'',request.cookies.get('emw3_staging_nonce')?.value||'',process.env.STAGING_HANDOFF_RECEIPTS_DIR||join(process.cwd(),'.state','staging-handoff'));
 const response=NextResponse.redirect(new URL(result.returnTo,STAGING_ORIGIN));
 response.cookies.set(SESSION_COOKIE,await signAuthPayload(result.user,'site-session',SESSION_MAX_AGE),authCookieOptions(SESSION_MAX_AGE));response.cookies.set('emw3_staging_nonce','',{...authCookieOptions(0),path:'/api/auth/staging/callback'});response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
 }catch{return new NextResponse('This sign-in link has expired or was already used. Open staging again to retry.',{status:401,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}
}
