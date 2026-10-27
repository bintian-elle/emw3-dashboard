import {defaultDashboardRange} from '@/lib/ai-dashboard-periods';
import {NextRequest,NextResponse} from 'next/server';
import {dashboardOwner} from '@/lib/ai-dashboard-access';
import {METRICS} from '@/lib/ai-dashboard';
import {projectFor} from '@/lib/ai-dashboard-options';
import {servedProjectOverview,publishedProjectChoices} from '@/lib/ai-dashboard-published';
export const runtime='nodejs';
export async function GET(request:NextRequest){try{await dashboardOwner(request);const selected=projectFor(request.nextUrl.searchParams.get('project')||'bluevua'),targetRange=defaultDashboardRange();const {publication,pendingPeriod}=await servedProjectOverview(selected.id,targetRange);const projects=await publishedProjectChoices(),project=projects.find(p=>p.id===selected.id)!;return NextResponse.json({project,projects,range:publication?.range||targetRange,targetRange,pendingPeriod,generatedAt:publication?.generatedAt||null,preparationError:null,sources:project.available?Object.fromEntries(project.sources.map(s=>[s,METRICS[s as keyof typeof METRICS]])):{},report:publication?.report||null,message:project.available?null:`${project.name} overview has not been published yet.`},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Published overview is unavailable. Please retry shortly.'},{status:503});}}
