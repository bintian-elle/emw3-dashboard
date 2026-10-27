import {readPublishedOverview} from '@/lib/ai-dashboard-published';
import {runWithDashboardProject} from '@/lib/ai-dashboard-project';
import {projectReadiness} from '@/lib/ai-dashboard-overview';
import {defaultDashboardRange} from '@/lib/ai-dashboard-periods';
import {NextRequest,NextResponse} from 'next/server';
import {projectFor} from '@/lib/ai-dashboard-options';
import {createJob,publicJob} from '@/lib/ai-dashboard-jobs';
import {dashboardOwner,requireSameOrigin} from '@/lib/ai-dashboard-access';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 try{const owner=await dashboardOwner(request);requireSameOrigin(request);const raw=await request.text();if(raw.length>400000)return NextResponse.json({error:'Request too large.'},{status:413});const body=JSON.parse(raw);const project=projectFor(body.project||'bluevua');if(!(await readPublishedOverview(project.id))&&!(await projectReadiness(project.id,defaultDashboardRange())).available)throw Error(`${project.name} has no local marketing snapshot yet.`);const job=await runWithDashboardProject(project.id,()=>createJob(body.prompt,owner,body.parentId,body.context,body.conversation));return NextResponse.json(publicJob(job),{status:202,headers:{'Cache-Control':'no-store'}});}
 catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not create task.'},{status:400});}
}
