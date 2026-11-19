import {notFound} from 'next/navigation';
import {PROJECTS,type ProjectId} from '@/lib/ai-dashboard-options';
import {AccountDashboardStudio} from '../account-studio';
export default async function ProjectDashboardPage({params}:{params:Promise<{project:string}>}){const {project}=await params;if(!PROJECTS.some(p=>p.id===project))notFound();return <AccountDashboardStudio key={project} initialProject={project as ProjectId}/>;}
