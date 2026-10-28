import {revalidatePath} from 'next/cache';
import {publishTestingDataSnapshot} from '@/lib/testing-data-cache';
import {handleScheduledSocialRefresh} from '@/lib/testing-social-scheduled-refresh';
import {isCompleteSocialSnapshot} from '@/lib/testing-social-snapshot';

export const maxDuration=300;

export async function POST(request:Request){
 return handleScheduledSocialRefresh(request,process.env.CRON_SECRET?.trim()||process.env.AI_WORKER_SECRET?.trim(),async()=>{
  const {fetchFreshSocialPerformance}=await import('@/lib/testing-social');
  return publishTestingDataSnapshot('social',{},fetchFreshSocialPerformance,{skipValidToday:isCompleteSocialSnapshot});
 },()=>revalidatePath('/bluevua/testing','layout'));
}
