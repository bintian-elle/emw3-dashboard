import {notFound} from 'next/navigation';
import {currentSiteUser} from '@/lib/current-site-user';
import {canAccessReviewTools} from '@/lib/review-access';
import {PromptsWorkspace} from './prompts-workspace';
export default async function PromptsPage(){const user=await currentSiteUser();if(!canAccessReviewTools(user))notFound();return <PromptsWorkspace/>;}
