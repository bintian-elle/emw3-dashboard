import { websiteTrackingTransport } from './website-tracking-transport.ts';
import { parseTrackingExport, trackingOverviewRequests, trackingEvents, trackingFilter, type TrackingPeriod, type TrackingReport, type TrackingData } from './website-tracking.ts';

type Envelope={status:string;resource_id?:string;timezone?:string;currency?:string;data?:Record<string,unknown>[];error?:{message?:string};coverage?:{complete?:boolean;cursor?:string};display?:{complete?:boolean};export_file?:string;response_metadata?:{subjectToThresholding?:boolean;dataLossFromOtherRow?:boolean;samplingMetadatas?:unknown[]}};
export async function fetchWebsiteTracking(period:TrackingPeriod,device:string):Promise<TrackingData>{
 const filter=trackingFilter(device),transport=await websiteTrackingTransport();
 const end=new Date(`${period.end}T12:00:00Z`);end.setUTCDate(end.getUTCDate()+1);
 let timeZone:string|undefined,currency:string|undefined;
 async function report(dimensions:string[],metrics:string[],events?:string[]):Promise<TrackingReport>{
  try{
   const expressions:unknown[]=[...filter.andGroup.expressions];if(events)expressions.push({filter:{fieldName:'eventName',inListFilter:{values:events}}});
   const envelope:Envelope=await transport.query({period:{start:period.start,end:end.toISOString().slice(0,10)},dimensions,metrics,dimensionFilter:{andGroup:{expressions}},page_size:200,max_rows:1000});
   if(envelope.resource_id!=='451107071')throw Error('The shared tool returned a different GA4 property. Report not displayed.');
   timeZone=envelope.timezone;currency=envelope.currency;
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
  }catch(error){return {rows:[],warnings:[],error:error instanceof Error?error.message:'Report unavailable.'};}
 }
 // The CLI serializes calls through a shared lock; keep these requests sequential.
 const requests=trackingOverviewRequests(device);
 const overview=await report(requests.overall.dimensions,requests.overall.metrics);
 const devices=requests.devices?await report(requests.devices.dimensions,requests.devices.metrics):undefined;
 const events=await report(['eventName'],['eventCount','totalUsers'],trackingEvents);
 const actions=await report(['eventName','customEvent:feature_source','customEvent:feature_action','customEvent:feature_result','customEvent:entry_point'],['eventCount','totalUsers'],['cart_feature_action','cart_feature_result']);
 const lists=await report(['itemListId','itemName'],['itemsViewedInList','itemsClickedInList','itemsAddedToCart']);
 const purchases=await report(['itemListId','itemName'],['itemsPurchased','itemRevenue']);
 return {overview,devices,events,actions,lists,purchases,timeZone,currency,fetchedAt:new Date().toISOString(),property:'451107071'};
}
