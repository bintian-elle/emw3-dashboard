import {scheduledReports} from './report-periods.mjs';
import {missingUpdatedChannels} from './report-readiness.mjs';
/** Called by the scheduled runner after collecting authoritative update markers. */
export async function runScheduledReports({day,now,records,hasReport,generate}){
 const missing=missingUpdatedChannels(records,day,now);
 if(missing.length)throw Error(`Waiting for updated channel data: ${missing.join(', ')}`);
 const generated=[],errors=[];
 for(const period of scheduledReports(day)){
  try{if(await hasReport(period))continue;await generate(period);generated.push(period);}
  catch(error){errors.push(`${period.kind}: ${error instanceof Error?error.message:String(error)}`);}
 }
 if(errors.length)throw Error(errors.join('; '));
 return generated;
}
