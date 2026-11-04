import {NextRequest,NextResponse} from 'next/server';
import {dashboardOwner,requireSameOrigin} from '@/lib/ai-dashboard-access';
import {materializeReport,validateReport,validateRange} from '@/lib/ai-dashboard';
import {runWithDashboardProject} from '@/lib/ai-dashboard-project';
import {prepareDashboardData} from '@/lib/ai-dashboard-refresh';
import {projectFor} from '@/lib/ai-dashboard-options';
export const runtime='nodejs';
export async function POST(request:NextRequest){try{await dashboardOwner(request);requireSameOrigin(request);const raw=await request.text();if(raw.length>400000)return NextResponse.json({error:'Request too large.'},{status:413});const body=JSON.parse(raw),project=projectFor(body.project||'bluevua');const spec=validateReport({...body.report,...body.range?{range:validateRange(body.range.start,body.range.end)}:{}});const report=await runWithDashboardProject(project.id,async()=>{if(body.refresh===true&&spec.widgets.length)await prepareDashboardData(spec.range);return materializeReport(spec,spec.widgets.map(w=>({source:w.source,groupBy:w.groupBy,...spec.range})));});return NextResponse.json({report},{headers:{'Cache-Control':'no-store'}});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not refresh report data.'},{status:400});}}
