import {readSnapshot,refreshSnapshot,snapshotPaths,type CacheOptions} from './website-tracking-store.ts';
import {trackingPageScope,type TrackingPageData,type TrackingPageScope} from './website-tracking-pages.ts';
import type {TrackingPeriod,TrackingReport} from './website-tracking.ts';
function completeReport(report:TrackingReport|undefined){return !!report&&Array.isArray(report.rows)&&Array.isArray(report.warnings)&&!report.error&&!report.warnings.some(w=>w.startsWith('Partial GA4 report'))&&report.rows.every(row=>Array.isArray(row.dimensions)&&row.dimensions.every(v=>typeof v==='string')&&Array.isArray(row.metrics)&&row.metrics.every(v=>Number.isFinite(v)));}
function contract(period:TrackingPeriod,device:string,scope:TrackingPageScope){
 trackingPageScope(scope.page,scope.path);
 return {identity:{version:1,property:'451107071',period,device,scope},complete:(data:TrackingPageData|undefined)=>!!data&&data.property==='451107071'&&data.scope?.page===scope.page&&data.scope?.path===scope.path&&[data.events,data.features,data.daily].every(completeReport)&&!!data.paths&&Array.isArray(data.paths.rows)&&!data.paths.error};
}
export const trackingPageCachePaths=(period:TrackingPeriod,device:string,scope:TrackingPageScope,directory?:string)=>snapshotPaths(contract(period,device,scope).identity,directory);
export const readTrackingPageCache=(period:TrackingPeriod,device:string,scope:TrackingPageScope,options:CacheOptions={})=>readSnapshot(contract(period,device,scope),options);
export const refreshTrackingPageCache=(period:TrackingPeriod,device:string,scope:TrackingPageScope,load:()=>Promise<TrackingPageData>,options:CacheOptions={})=>refreshSnapshot(contract(period,device,scope),load,options);
