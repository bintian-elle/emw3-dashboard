import {randomUUID} from 'node:crypto';
import {redirect} from 'next/navigation';
import {PROJECTS,type ProjectId} from '@/lib/ai-dashboard-options';
import {DashboardStudio} from '../studio';
export default async function NewDashboardPage({searchParams}:{searchParams:Promise<{id?:string;project?:string}>}){const query=await searchParams;const project=PROJECTS.some(p=>p.id===query.project)?query.project as ProjectId:'bluevua';if(!query.id||!/^[-a-f0-9]{36}$/i.test(query.id))redirect(`/ai-tools/dashboard-builder/new?project=${project}&id=${randomUUID()}`);return <DashboardStudio key={`${project}:${query.id}`} initialProject={project} dashboardId={query.id}/>;}
