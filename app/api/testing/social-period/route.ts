import {NextRequest} from 'next/server';
import {dashboardOwner} from '@/lib/ai-dashboard-access';
import {getSocialPaidPeriod} from '@/lib/testing-social-paid.server';
import {testingLatestCompleteDate} from '@/lib/testing-period';

const headers={'Cache-Control':'private, no-store'};
export async function GET(request:NextRequest){
 try{await dashboardOwner(request);}catch{return Response.json({error:'Unauthorized'},{status:401,headers});}
 const start=request.nextUrl.searchParams.get('start')??'',end=request.nextUrl.searchParams.get('end')??'';
 const valid=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)===date;
 if(!valid(start)||!valid(end)||start>end||end>testingLatestCompleteDate())return Response.json({error:'Invalid reporting period'},{status:400,headers});
 try{
  const result=await getSocialPaidPeriod({start,end});
  return Response.json(result,{headers});
 }catch(error){
  const limited=error instanceof Error&&/rate limit/i.test(error.message);
  return Response.json({error:limited?'Rate limited. Please try again later.':'Period data is unavailable. Please try again later.'},{status:limited?429:503,headers});
 }
}
