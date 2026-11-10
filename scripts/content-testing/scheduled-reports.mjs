import {scheduledReports} from './report-periods.mjs';
import {missingUpdatedChannels,updatedOnReportingDay} from './report-readiness.mjs';
/** Called by the scheduled runner after collecting authoritative update markers. */
export async function runScheduledReports({day,now,records,hasReport,generate,redditLifetime,socialLifetime}){
 const missing=missingUpdatedChannels(records,day,now);
 const generated=[],errors=missing.length?[`Waiting for updated channel data: ${missing.join(', ')}`]:[];
 const periods=scheduledReports(day);
 for(const period of missing.length?[]:periods){
  try{if(await hasReport(period))continue;await generate(period);generated.push(period);}
  catch(error){errors.push(`${period.kind}: ${error instanceof Error?error.message:String(error)}`);}
 }
 const weekly=periods.find(period=>period.kind==='weekly');
 if(weekly)for(const [coverage,task] of [['reddit-lifetime',redditLifetime],['social-lifetime',socialLifetime]]){
  if(!task)continue;
  try{
   if(await task.hasReport(weekly))continue;
   if(!updatedOnReportingDay(task.snapshot,day,now))throw Error(`Waiting for the updated ${coverage==='reddit-lifetime'?'Reddit':'Social Media'} Lifetime snapshot`);
   await task.generate(weekly);
   generated.push({...weekly,coverage});
  }catch(error){errors.push(`${coverage}: ${error instanceof Error?error.message:String(error)}`);}
 }
 if(errors.length)throw Error(errors.join('; '));
 return generated;
}
