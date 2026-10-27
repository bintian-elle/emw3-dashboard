import type {FeatureTrackingReports} from './website-tracking-inventory.ts';
import type {CollectionActivity,TrackingComparison} from './website-tracking-metrics.ts';
export type TrackingPeriod = { start: string; end: string };
export type TrackingDevice = 'all' | 'desktop' | 'mobile' | 'tablet';
export type TrackingRow = { dimensions: string[]; metrics: number[] };
export type TrackingReport = { rows: TrackingRow[]; error?: string; warnings: string[] };
export type TrackingData={overview:TrackingReport;devices?:TrackingReport;events:TrackingReport;actions:TrackingReport;purchases:TrackingReport;lists:TrackingReport;timeZone?:string;currency?:string;fetchedAt:string;property:string;collection?:CollectionActivity;comparison?:TrackingComparison;collectionDaily?:TrackingReport;features?:Partial<FeatureTrackingReports>};
export const trackingEvents = ['cart_feature_action', 'cart_feature_result', 'view_item_list', 'select_item', 'compare_entry_view', 'compare_click', 'compare_view'];
export const trackingFeatures = ['Switch to Bundle', 'You May Also Like', 'PDP Add-ons', 'Compare', 'Promo Code'];
export function trackingPeriod(query: {start?: string; end?: string}, now = new Date()): TrackingPeriod {
 const today = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Juneau',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const endDate = new Date(`${today}T12:00:00Z`); endDate.setUTCDate(endDate.getUTCDate()-1);
 const startDate = new Date(endDate); startDate.setUTCDate(startDate.getUTCDate()-29);
 const start=query.start??startDate.toISOString().slice(0,10), end=query.end??endDate.toISOString().slice(0,10);
 const valid=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 if(!valid(start)||!valid(end)||start>end)throw Error('Choose a valid date range with the start on or before the end.');
 return {start,end};
}
type Expression = { filter: { fieldName:string; inListFilter?:{values:string[]}; stringFilter?:{matchType:string;value:string} } };
export function trackingFilter(device:string):{andGroup:{expressions:Expression[]}} {
 if(!['all','desktop','mobile','tablet'].includes(device))throw Error('Choose a supported device category.');
 const expressions:Expression[]=[{filter:{fieldName:'hostName',inListFilter:{values:['bluevua.com','www.bluevua.com']}}}];
 if(device!=='all')expressions.push({filter:{fieldName:'deviceCategory',stringFilter:{matchType:'EXACT',value:device}}});
 return {andGroup:{expressions}};
}
export function eventRate(numerator:number,denominator:number){return denominator>0?numerator/denominator:null;}
export function parseTrackingExport(text:string):Record<string,unknown>[] {
 let rows:unknown;
 try{rows=JSON.parse(text);}catch{rows=text.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));}
 if(!Array.isArray(rows))rows=(rows as {data?:unknown})?.data;
 if(!Array.isArray(rows)||rows.some(row=>!row||typeof row!=='object'||Array.isArray(row)))throw Error('The GA4 report export could not be read.');
 return (rows as Record<string,unknown>[]).filter(row=>!('metadata' in row && Object.keys(row).length===1));
}
export const trackingOverviewMetrics = ['totalUsers','eventCount','addToCarts','ecommercePurchases'];
export function trackingOverviewRequests(device:string){
 const dimensionFilter=trackingFilter(device);
 return {
  overall:{dimensions:[] as string[],metrics:trackingOverviewMetrics,dimensionFilter},
  devices:device==='all'?{dimensions:['deviceCategory'],metrics:trackingOverviewMetrics,dimensionFilter}:undefined,
 };
}
export function trackingDeviceShares(rows:TrackingRow[]){
 const total=rows.reduce((sum,row)=>sum+(row.metrics[1]??0),0);
 return rows.map(row=>({device:row.dimensions[0]||'(not set)',metrics:row.metrics,share:total>0?(row.metrics[1]??0)/total:0}));
}
export function trackingDeviceLabel(device:string){
 return device==='all'?'All devices · Combined':`${device.charAt(0).toUpperCase()}${device.slice(1)} only`;
}
export function trackingReloadTarget(navigation:{type:string;name:string}|undefined,currentHref:string):string|null {
 if(navigation?.type!=='reload')return null;
 try{
  const current=new URL(currentHref),initial=new URL(navigation.name);
  if(current.pathname!=='/bluevua/tracking'||initial.origin!==current.origin||initial.pathname!==current.pathname||initial.search!==current.search)return null;
  if(!['start','end','device','page','path'].some(key=>current.searchParams.has(key))&&!current.hash)return null;
  return '/bluevua/tracking';
 }catch{return null;}
}
