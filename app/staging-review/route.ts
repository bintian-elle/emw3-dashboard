import {NextResponse} from 'next/server';
import {currentSiteUser} from '@/lib/current-site-user';
import {createStagingTicket,isStagingReviewer,STAGING_ORIGIN,PRODUCTION_ORIGIN} from '@/lib/staging-access';
export async function GET(request:Request){
 if(process.env.DEPLOYMENT_ENV==='staging')return NextResponse.redirect(new URL('/api/auth/staging/start',STAGING_ORIGIN));
 const user=await currentSiteUser();
 if(!user){const url=new URL('/access',PRODUCTION_ORIGIN);url.searchParams.set('returnTo',new URL(request.url).pathname+new URL(request.url).search);return NextResponse.redirect(url);}
 if(!isStagingReviewer(user.email))return new NextResponse('Your account is not on the staging review list.',{status:403,headers:{'Cache-Control':'no-store'}});
 const params=new URL(request.url).searchParams,nonce=params.get('state');
 if(!nonce)return NextResponse.redirect(new URL('/api/auth/staging/start',STAGING_ORIGIN));
 try{const ticket=await createStagingTicket(user,nonce,params.get('returnTo')||'/');const target=new URL('/api/auth/staging/callback',STAGING_ORIGIN);target.searchParams.set('ticket',ticket);const response=NextResponse.redirect(target);response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;}catch{return new NextResponse('Staging sign-in is unavailable. Please contact the administrator.',{status:503});}
}
