import nextEnv from '@next/env';
import {recordTrackingRun} from './website-tracking-notices.mjs';
nextEnv.loadEnvConfig(process.cwd());
const {trackingPeriod}=await import('../lib/website-tracking.ts');
const {readTrackingCache,refreshTrackingCache}=await import('../lib/website-tracking-cache.ts');
const {fetchWebsiteTracking}=await import('../lib/website-tracking-live.ts');
const {trackingPageScope}=await import('../lib/website-tracking-pages.ts');
const {readTrackingPageCache,refreshTrackingPageCache}=await import('../lib/website-tracking-page-cache.ts');
const {fetchTrackingPage}=await import('../lib/website-tracking-page-live.ts');
if(process.argv.includes('--check')){
 console.log('Website Tracking cache worker configuration loaded; no GA4 requests submitted.');
}else{
 const period=trackingPeriod({});
 let refreshed=0,failed=0;const failures=[];
 async function collect(device,scope,read,refresh){
  try{
   if(await refresh()){refreshed++;return;}
   const state=await read();
   if(!state.error&&state.data)return;
   failed++;failures.push({device,scope,...(state.failure??{code:'refresh_failed'})});
  }catch(error){
   const {trackingFailure}=await import('../lib/website-tracking-errors.ts');
   failed++;failures.push({device,scope,...trackingFailure(error)});
  }
 }
 // The shared data tool has a global query lock. Warm scopes sequentially.
 for(const device of ['all','desktop','mobile','tablet']){
  const scheduled=process.argv.includes('--scheduled');
  await collect(device,'overview',()=>readTrackingCache(period,device),async()=>{
   const state=await readTrackingCache(period,device);
   return scheduled||state.needsRefresh?refreshTrackingCache(period,device,()=>fetchWebsiteTracking(period,device),{force:scheduled}):false;
  });
  const scope=trackingPageScope();
  await collect(device,'collection',()=>readTrackingPageCache(period,device,scope),()=>refreshTrackingPageCache(period,device,scope,()=>fetchTrackingPage(period,device,scope),{force:scheduled}));
 }
 const result={job:'website-tracking-cache',refreshed,failed,failures,period};
 console.log(JSON.stringify(result));
 await recordTrackingRun(result);
 if(failed)process.exitCode=1;
}
