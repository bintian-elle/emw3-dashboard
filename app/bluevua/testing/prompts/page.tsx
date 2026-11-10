import {notFound} from 'next/navigation';
import {isReviewPreview} from '@/lib/review-preview.server';
import {PromptsWorkspace} from './prompts-workspace';
export default async function PromptsPage(){if(!await isReviewPreview())notFound();return <PromptsWorkspace/>;}
