import {NextRequest,NextResponse} from 'next/server';
import {getJob,publicJob} from '@/lib/ai-dashboard-jobs';
import {dashboardOwner} from '@/lib/ai-dashboard-access';
export const runtime='nodejs';
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{const owner=await dashboardOwner(request);const {id}=await params;return NextResponse.json(publicJob(await getJob(id,owner)),{headers:{'Cache-Control':'no-store'}});}
 catch{return NextResponse.json({error:'Task not found.'},{status:404});}
}
