import {notFound} from 'next/navigation';
import {currentSiteUser} from '@/lib/current-site-user';
import {isStagingReviewer} from '@/lib/staging-review-policy';
import {PromptsWorkspace} from './prompts-workspace';
export default async function PromptsPage(){const user=await currentSiteUser();if(process.env.DEPLOYMENT_ENV!=='staging'||!user||!isStagingReviewer(user.email))notFound();return <PromptsWorkspace/>;}
