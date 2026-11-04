import {randomBytes} from 'node:crypto';
import {NextResponse} from 'next/server';
import {PRODUCTION_ORIGIN} from '@/lib/staging-access';
import {safeReturnPath,authCookieOptions} from '@/lib/site-auth';
export async function GET(request:Request){
 if(process.env.DEPLOYMENT_ENV!=='staging')return new NextResponse('Not found',{status:404});
 const nonce=randomBytes(32).toString('hex'),returnTo=safeReturnPath(new URL(request.url).searchParams.get('returnTo'));
 const url=new URL('/staging-review',PRODUCTION_ORIGIN);url.searchParams.set('state',nonce);url.searchParams.set('returnTo',returnTo);
 const response=NextResponse.redirect(url);response.cookies.set('emw3_staging_nonce',nonce,{...authCookieOptions(300),path:'/api/auth/staging/callback'});response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
}
