import {NextResponse} from 'next/server';
import {currentSiteUser} from '@/lib/current-site-user';
import {authOrigin} from '@/lib/site-auth';
import {canAccessReviewTools,canWriteReviewTools,reviewExpectedOrigin} from '@/lib/review-access';

export async function POST(request:Request){
 const user=await currentSiteUser();
 if(!canAccessReviewTools(user))return NextResponse.json({error:'Not available'},{status:403});
 const expected=reviewExpectedOrigin(request.url,authOrigin(request.url),process.env.LOCAL_PRODUCTION_PREVIEW==='1');
 if(!canWriteReviewTools(user,request.headers.get('origin'),expected))return NextResponse.json({error:'Invalid origin'},{status:403});
 const body=await request.json().catch(()=>null);
 if(typeof body?.enabled!=='boolean')return NextResponse.json({error:'Invalid selection'},{status:400});
 const response=NextResponse.json({enabled:body.enabled},{headers:{'Cache-Control':'private, no-store'}});
 response.cookies.set('review_preview',body.enabled?'1':'',{httpOnly:true,sameSite:'lax',secure:new URL(request.url).protocol==='https:',path:'/',maxAge:body.enabled?60*60*24*7:0});
 return response;
}
