import {websiteTrackingTransport} from './website-tracking-transport.ts';
import {parseTrackingExport,trackingFilter,type TrackingPeriod,type TrackingReport} from './website-tracking.ts';
import {trackingFailure,trackingError,type TrackingFailure} from './website-tracking-errors.ts';
type Envelope={status:string;resource_id?:string;timezone?:string;currency?:string;data?:Record<string,unknown>[];error?:{message?:string};coverage?:{complete?:boolean;cursor?:string};display?:{complete?:boolean};export_file?:string;response_metadata?:{subjectToThresholding?:boolean;dataLossFromOtherRow?:boolean;samplingMetadatas?:unknown[]}};
export async function trackingReportReader(period:TrackingPeriod,device:string,providedTransport?:Awaited<ReturnType<typeof websiteTrackingTransport>>){
 const filter=trackingFilter(device),transport=providedTransport??await websiteTrackingTransport();
 let failure:TrackingFailure|undefined;
 const metadata:{timeZone?:string;currency?:string}={};
 async function report(dimensions:string[],metrics:string[],events?:string[],range:TrackingPeriod=period,extra:unknown[]=[]):Promise<TrackingReport>{
  if(failure)return {rows:[],warnings:[],error:trackingError(failure.code,failure).message,diagnostic:failure};
  try{
   const expressions:unknown[]=[...filter.andGroup.expressions,...extra];if(events)expressions.push({filter:{fieldName:'eventName',inListFilter:{values:events}}});
   const end=new Date(`${range.end}T12:00:00Z`);end.setUTCDate(end.getUTCDate()+1);
   const envelope:Envelope=await transport.query({period:{start:range.start,end:end.toISOString().slice(0,10)},dimensions,metrics,dimensionFilter:{andGroup:{expressions}},page_size:200,max_rows:1000});
   if(envelope.resource_id!=='451107071')throw Error('The shared tool returned a different GA4 property. Report not displayed.');
   metadata.timeZone=envelope.timezone;metadata.currency=envelope.currency;
   let data=envelope.data??[];
   if(envelope.display?.complete===false){
    if(!envelope.export_file)throw Error('The shared tool returned only a preview without a full report export.');
    data=parseTrackingExport(await transport.readExport(envelope.export_file));
   }
   const warnings:string[]=[];
   if(envelope.status==='partial'||envelope.coverage?.complete===false)warnings.push('Partial GA4 report. Narrow the date range before comparing totals.');
   if(envelope.response_metadata?.subjectToThresholding)warnings.push('GA4 privacy thresholds may hide some rows.');
   if(envelope.response_metadata?.dataLossFromOtherRow)warnings.push('GA4 grouped some dimension values into (other).');
   if(envelope.response_metadata?.samplingMetadatas?.length)warnings.push('GA4 returned sampled data.');
   return {rows:data.map(row=>({dimensions:dimensions.map(name=>String(row[name]??'')),metrics:metrics.map(name=>Number(row[name])||0)})),warnings};
  }catch(error){failure=trackingFailure(error);return {rows:[],warnings:[],error:trackingError(failure.code,failure).message,diagnostic:failure};}
 }
 return {report,metadata};
}
