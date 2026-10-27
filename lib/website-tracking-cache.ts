import {readSnapshot,refreshSnapshot,snapshotPaths,type CacheOptions,type SnapshotState} from './website-tracking-store.ts';
import type {TrackingData,TrackingPeriod,TrackingReport} from './website-tracking.ts';
export {CACHE_TTL_MS} from './website-tracking-store.ts';
export type TrackingCacheState=SnapshotState<TrackingData>;
function completeReport(report:TrackingReport|undefined){return !!report&&Array.isArray(report.rows)&&Array.isArray(report.warnings)&&report.warnings.every(warning=>typeof warning==='string')&&!report.error&&!report.warnings.some(warning=>warning.startsWith('Partial GA4 report'))&&report.rows.every(row=>!!row&&typeof row==='object'&&Array.isArray(row.dimensions)&&row.dimensions.every(value=>typeof value==='string')&&Array.isArray(row.metrics)&&row.metrics.every(value=>Number.isFinite(value)));}
function completeSupplement(data:TrackingData){
 const reports:TrackingReport[]=[];
 if(data.collection)reports.push(data.collection.visitors,data.collection.clicks);
 if(data.collectionDaily)reports.push(data.collectionDaily);
 if(data.features)reports.push(...Object.values(data.features));
 if(data.comparison)reports.push(data.comparison.overview,data.comparison.events,data.comparison.collection.visitors,data.comparison.collection.clicks);
 return reports.every(completeReport);
}
function complete(data:TrackingData|undefined,device:string){return !!data&&data.property==='451107071'&&Number.isFinite(Date.parse(data.fetchedAt))&&['overview','events','actions','lists','purchases'].every(key=>completeReport(data[key as keyof TrackingData] as TrackingReport))&&(device!=='all'||completeReport(data.devices))&&completeSupplement(data);}

function contract(period:TrackingPeriod,device:string){return {identity:{version:4,property:'451107071',period,device},complete:(data:TrackingData|undefined)=>complete(data,device)};}
export function trackingCachePaths(period:TrackingPeriod,device:string,directory?:string){return snapshotPaths(contract(period,device).identity,directory);}
export function readTrackingCache(period:TrackingPeriod,device:string,options:CacheOptions={}){return readSnapshot(contract(period,device),options);}
export function refreshTrackingCache(period:TrackingPeriod,device:string,load:()=>Promise<TrackingData>,options:CacheOptions={}){return refreshSnapshot(contract(period,device),load,options);}
