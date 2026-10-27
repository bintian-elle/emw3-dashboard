import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {acquireTrackingLease} from './website-tracking-lease.ts';
import {trackingFilter,trackingPeriod,type TrackingPeriod} from './website-tracking.ts';
export const CACHE_TTL_MS=60*60*1000;
const RETRY_MS=5*60*1000;
// Metadata freshness only; kernel leases protect the complete sequential refresh.
const LOCK_TTL_MS=55*60*1000;
export type CacheIdentity={version:number;property:string;period:TrackingPeriod;device:string;scope?:unknown};
export type CacheValue={property:string;fetchedAt:string};
export type CacheContract<T extends CacheValue>={identity:CacheIdentity;complete:(data:T|undefined)=>boolean};
export type CacheOptions={directory?:string;now?:number;force?:boolean};
type Snapshot<T>=CacheIdentity&{data:T};
type Failure={failedAt:number};
type Owner={pid:number;token:string;startedAt:number};
function alive(pid:number){try{process.kill(pid,0);return true;}catch(error){return (error as NodeJS.ErrnoException).code==='EPERM';}}
export type SnapshotState<T>={data?:T;stale:boolean;refreshing:boolean;needsRefresh:boolean;error?:string};
export function snapshotPaths(identity:CacheIdentity,directory=process.env.WEBSITE_TRACKING_CACHE_DIR||path.join(process.cwd(),'.state/website-tracking')){
 trackingPeriod(identity.period);trackingFilter(identity.device);
 const key=createHash('sha256').update(JSON.stringify(identity)).digest('hex');
 return {directory,snapshot:path.join(directory,`${key}.json`),failure:path.join(directory,`${key}.failure.json`),lock:path.join(directory,`${key}.lock`),owner:path.join(directory,`${key}.owner.json`)};
}
async function json<T>(file:string):Promise<T|undefined>{try{return JSON.parse(await readFile(file,'utf8')) as T;}catch(error){if(error instanceof SyntaxError||(error as NodeJS.ErrnoException).code==='ENOENT')return;throw error;}}
function accept<T>(data:T|undefined,complete:(data:T|undefined)=>boolean){try{return complete(data);}catch{return false;}}
export async function readSnapshot<T extends CacheValue>(contract:CacheContract<T>,options:CacheOptions={}):Promise<SnapshotState<T>>{
 const {identity,complete}=contract,{period,device}=identity;
 const files=snapshotPaths(identity,options.directory),now=options.now??Date.now();
 const [snapshot,failure,owner]=await Promise.all([json<Snapshot<T>>(files.snapshot),json<Failure>(files.failure),json<Owner>(files.owner)]);
 const valid=snapshot?.version===identity.version&&snapshot.device===device&&snapshot.period?.start===period.start&&snapshot.period?.end===period.end&&JSON.stringify(snapshot.scope??null)===JSON.stringify(identity.scope??null)&&accept(snapshot.data,complete)&&Date.parse(snapshot.data.fetchedAt)<=now+5*60000;
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
export async function refreshSnapshot<T extends CacheValue>(contract:CacheContract<T>,load:()=>Promise<T>,options:CacheOptions={}):Promise<boolean>{
 const {identity,complete}=contract;
 const files=snapshotPaths(identity,options.directory);
 await mkdir(files.directory,{recursive:true,mode:0o700});
 const state=await readSnapshot(contract,options);
 if(state.refreshing||(!options.force&&!state.needsRefresh))return false;
 const lease=await acquireTrackingLease(files.lock);
 if(!lease)return false;
 const token=randomUUID();
 try{await atomic(files.owner,{pid:process.pid,token,startedAt:Date.now()} satisfies Owner);}catch(error){await lease.release();throw error;}

 try{
  const data=await load();
  if(!complete(data)||!lease.isHeld())throw Error('Incomplete report or lost lock');
  await atomic(files.snapshot,{...identity,data} satisfies Snapshot<T>);
  await rm(files.failure,{force:true});
  return true;
 }catch{
  if(lease.isHeld())await atomic(files.failure,{failedAt:options.now??Date.now()} satisfies Failure);
  return false;
 }finally{
  try{if((await json<Owner>(files.owner))?.token===token)await rm(files.owner,{force:true});}finally{await lease.release();}
 }
}
