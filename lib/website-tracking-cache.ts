import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {acquireTrackingLease} from './website-tracking-lease.ts';
import {trackingFilter,trackingPeriod,type TrackingData,type TrackingPeriod,type TrackingReport} from './website-tracking.ts';
export const CACHE_TTL_MS=60*60*1000;
const RETRY_MS=5*60*1000;
// Each snapshot has at most six sequential, bounded 125-second queries.
const LOCK_TTL_MS=20*60*1000;
const VERSION=1;
type Options={directory?:string;now?:number;force?:boolean};
type Snapshot={version:number;period:TrackingPeriod;device:string;data:TrackingData};
type Failure={failedAt:number};
type Owner={pid:number;token:string;startedAt:number};
function alive(pid:number){try{process.kill(pid,0);return true;}catch(error){return (error as NodeJS.ErrnoException).code==='EPERM';}}
export type TrackingCacheState={data?:TrackingData;stale:boolean;refreshing:boolean;needsRefresh:boolean;error?:string};
export function trackingCachePaths(period:TrackingPeriod,device:string,directory=process.env.WEBSITE_TRACKING_CACHE_DIR||path.join(process.cwd(),'.state/website-tracking')){
 trackingPeriod(period);trackingFilter(device);
 const key=createHash('sha256').update(JSON.stringify({version:VERSION,property:'451107071',period,device})).digest('hex');
 return {directory,snapshot:path.join(directory,`${key}.json`),failure:path.join(directory,`${key}.failure.json`),lock:path.join(directory,`${key}.lock`),owner:path.join(directory,`${key}.owner.json`)};
}
async function json<T>(file:string):Promise<T|undefined>{try{return JSON.parse(await readFile(file,'utf8')) as T;}catch(error){if(error instanceof SyntaxError||(error as NodeJS.ErrnoException).code==='ENOENT')return;throw error;}}
function completeReport(report:TrackingReport|undefined){return !!report&&Array.isArray(report.rows)&&Array.isArray(report.warnings)&&report.warnings.every(warning=>typeof warning==='string')&&!report.error&&!report.warnings.some(warning=>warning.startsWith('Partial GA4 report'))&&report.rows.every(row=>!!row&&typeof row==='object'&&Array.isArray(row.dimensions)&&row.dimensions.every(value=>typeof value==='string')&&Array.isArray(row.metrics)&&row.metrics.every(value=>Number.isFinite(value)));}
function complete(data:TrackingData|undefined,device:string){return !!data&&data.property==='451107071'&&Number.isFinite(Date.parse(data.fetchedAt))&&['overview','events','actions','lists','purchases'].every(key=>completeReport(data[key as keyof TrackingData] as TrackingReport))&&(device!=='all'||completeReport(data.devices));}
export async function readTrackingCache(period:TrackingPeriod,device:string,options:Options={}):Promise<TrackingCacheState>{
 const files=trackingCachePaths(period,device,options.directory),now=options.now??Date.now();
 const [snapshot,failure,owner]=await Promise.all([json<Snapshot>(files.snapshot),json<Failure>(files.failure),json<Owner>(files.owner)]);
 const valid=snapshot?.version===VERSION&&snapshot.device===device&&snapshot.period?.start===period.start&&snapshot.period?.end===period.end&&complete(snapshot.data,device)&&Date.parse(snapshot.data.fetchedAt)<=now+5*60000;
 const data=valid?snapshot.data:undefined;
 const stale=!data||now-Date.parse(data.fetchedAt)>=CACHE_TTL_MS;
 const refreshing=!!owner&&Number.isSafeInteger(owner.pid)&&owner.pid>0&&Number.isFinite(owner.startedAt)&&Date.now()-owner.startedAt<LOCK_TTL_MS&&alive(owner.pid);
 const failedAt=failure?.failedAt;
 const cooldown=typeof failedAt==='number'&&Number.isFinite(failedAt)&&now-failedAt<RETRY_MS;
 return {data,stale,refreshing,needsRefresh:stale&&!refreshing&&!cooldown,...(failedAt&&(!data||failedAt>=Date.parse(data.fetchedAt))?{error:'The background update failed. The last successful data is retained when available.'}:{})};
}
async function atomic(file:string,value:unknown){
 const temporary=`${file}.${randomUUID()}.tmp`;
 try{await writeFile(temporary,JSON.stringify(value),{mode:0o600});await rename(temporary,file);}finally{await rm(temporary,{force:true});}
}
export async function refreshTrackingCache(period:TrackingPeriod,device:string,load:()=>Promise<TrackingData>,options:Options={}):Promise<boolean>{
 const files=trackingCachePaths(period,device,options.directory);
 await mkdir(files.directory,{recursive:true,mode:0o700});
 const state=await readTrackingCache(period,device,options);
 if(state.refreshing||(!options.force&&!state.needsRefresh))return false;
 const lease=await acquireTrackingLease(files.lock);
 if(!lease)return false;
 const token=randomUUID();
 try{await atomic(files.owner,{pid:process.pid,token,startedAt:Date.now()} satisfies Owner);}catch(error){await lease.release();throw error;}

 try{
  const data=await load();
  if(!complete(data,device)||!lease.isHeld())throw Error('Incomplete report or lost lock');
  await atomic(files.snapshot,{version:VERSION,period,device,data} satisfies Snapshot);
  await rm(files.failure,{force:true});
  return true;
 }catch{
  if(lease.isHeld())await atomic(files.failure,{failedAt:options.now??Date.now()} satisfies Failure);
  return false;
 }finally{
  try{if((await json<Owner>(files.owner))?.token===token)await rm(files.owner,{force:true});}finally{await lease.release();}
 }
}
