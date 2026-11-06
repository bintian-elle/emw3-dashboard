import type {IntegratedReportBundle} from './testing-integrated-reports';

/** Refuse to combine partial language versions or results from different runs. */
export function assembleStoredBundle(runId:string,start:string,end:string,rows:Array<{channel:string;report:unknown}>):IntegratedReportBundle {
 const reports:IntegratedReportBundle['reports']={};
 for(const {channel,report} of rows){
  const item=report as {en?:{run_id?:string};zh?:{run_id?:string}};
  if(reports[channel]||item?.en?.run_id!==runId||item?.zh?.run_id!==runId)throw Error('Invalid stored report identity');
  reports[channel]=report as IntegratedReportBundle['reports'][string];
 }
 if(!rows.length)throw Error('Empty stored report');
 return {run_id:runId,period:{start,end},reports};
}
