import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const {trackingPeriod}=await import('../lib/website-tracking.ts');
const {readTrackingCache,refreshTrackingCache}=await import('../lib/website-tracking-cache.ts');
const {fetchWebsiteTracking}=await import('../lib/website-tracking-live.ts');
if(process.argv.includes('--check')){
 console.log('Website Tracking cache worker configuration loaded; no GA4 requests submitted.');
}else{
 const period=trackingPeriod({});
 let refreshed=0,failed=0;
 // The shared data tool has a global query lock. Warm scopes sequentially.
 for(const device of ['all','desktop','mobile','tablet']){
  const state=await readTrackingCache(period,device);
  if(!process.argv.includes('--scheduled')&&!state.needsRefresh)continue;
  const completed=await refreshTrackingCache(period,device,()=>fetchWebsiteTracking(period,device),{force:process.argv.includes('--scheduled')});
  if(completed)refreshed++;
  else if((await readTrackingCache(period,device)).error)failed++;
 }
 console.log(JSON.stringify({job:'website-tracking-cache',refreshed,failed}));
 if(failed)process.exitCode=1;
}
