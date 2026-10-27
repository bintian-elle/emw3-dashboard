import nextEnv from '@next/env';
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
 let refreshed=0,failed=0;
 // The shared data tool has a global query lock. Warm scopes sequentially.
 for(const device of ['all','desktop','mobile','tablet']){
  const state=await readTrackingCache(period,device);
  const scheduled=process.argv.includes('--scheduled');
  const completed=scheduled||state.needsRefresh?await refreshTrackingCache(period,device,()=>fetchWebsiteTracking(period,device),{force:scheduled}):false;
  if(completed)refreshed++;
  else if((await readTrackingCache(period,device)).error)failed++;
  const scope=trackingPageScope();
  const pageUpdated=await refreshTrackingPageCache(period,device,scope,()=>fetchTrackingPage(period,device,scope),{force:scheduled});
  if(pageUpdated)refreshed++;
  else if((await readTrackingPageCache(period,device,scope)).error)failed++;
 }
 console.log(JSON.stringify({job:'website-tracking-cache',refreshed,failed}));
 if(failed)process.exitCode=1;
}
