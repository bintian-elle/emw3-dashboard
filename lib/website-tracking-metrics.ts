import type {TrackingPeriod,TrackingReport} from './website-tracking.ts';
export type CollectionActivity={visitors:TrackingReport;clicks:TrackingReport};
export type TrackingComparison={period:TrackingPeriod;overview:TrackingReport;events:TrackingReport;collection:CollectionActivity};
export const collectionPathFilter={filter:{fieldName:'pagePath',stringFilter:{matchType:'PARTIAL_REGEXP',value:'(^|/)collections(/|$)'}}};
export function previousTrackingPeriod(period:TrackingPeriod):TrackingPeriod{
 const start=Date.parse(`${period.start}T00:00:00Z`),end=Date.parse(`${period.end}T00:00:00Z`),day=86400000;
 const length=Math.round((end-start)/day)+1;
 return {start:new Date(start-length*day).toISOString().slice(0,10),end:new Date(start-day).toISOString().slice(0,10)};
}
export function reportValue(report:TrackingReport|undefined,index=0):number|null{
 if(!report||report.error||report.warnings.some(w=>/partial|sampled|hide some|\(other\)/i.test(w)))return null;
 return report.rows[0]?.metrics[index]??0;
}
export function visitorRate(numerator:number|null,denominator:number|null):number|null{
 if(numerator===null||denominator===null||denominator<=0||numerator<0||numerator>denominator)return null;
 return numerator/denominator;
}
export function collectionMetrics(activity:CollectionActivity|undefined){
 const visitors=reportValue(activity?.visitors),clickers=reportValue(activity?.clicks);
 return {visitors,clickers,rate:visitorRate(clickers,visitors)};
}
export function trackingDelta(current:number|null,previous:number|null,rate=false){
 if(current===null||previous===null)return 'No comparison';
 if(rate){const change=(current-previous)*100;return `${change>0?'+':''}${change.toFixed(1)} pp`;}
 if(previous===0)return current===0?'0.0%':'No comparison';
 const change=(current/previous-1)*100;return `${change>0?'+':''}${change.toFixed(1)}%`;
}
export function collectionTrend(report:TrackingReport|undefined,period:TrackingPeriod){
 if(!report||report.error||report.warnings.length)return null;
 const dates:string[]=[],visitors:number[]=[],clickers:number[]=[];
 for(let date=Date.parse(`${period.start}T12:00:00Z`);date<=Date.parse(`${period.end}T12:00:00Z`);date+=86400000){
  const iso=new Date(date).toISOString().slice(0,10),key=iso.replaceAll('-','');dates.push(iso);
  visitors.push(report.rows.find(row=>row.dimensions[0]===key&&row.dimensions[1]==='page_view')?.metrics[0]??0);
  clickers.push(report.rows.find(row=>row.dimensions[0]===key&&row.dimensions[1]==='compare_click')?.metrics[0]??0);
 }
 return {dates,visitors,clickers};
}
