import 'server-only';
import {Pool} from 'pg';
import {testingDataSnapshotKey,type TestingDataChannel,type TestingDataInput} from './testing-data-cache-contract';
import {publishTestingData,type TestingDataPublishOptions} from './testing-data-publication';
import {VersionedSnapshotMemory} from './testing-memory-snapshot';
import {querySnapshotVersions} from './testing-snapshot-version-query';
export {TestingDataRefreshBusy,TestingDataRefreshRateLimit} from './testing-data-publication';

export type TestingDataSnapshot<T=unknown>={payload:T;updatedAt:string};
let pool:Pool|undefined;
let unavailableUntil=0;
type SnapshotMemoryState={scoped:VersionedSnapshotMemory<TestingDataSnapshot>;latest:VersionedSnapshotMemory<TestingDataSnapshot>;timer?:ReturnType<typeof setInterval>;checking?:Promise<void>;versions:Map<string,Promise<(string|null)[]>>;loads:Map<string,Promise<TestingDataSnapshot|null>>;emptyLatest:Set<string>};
declare global {var emw3TestingSnapshotMemoryV2:SnapshotMemoryState|undefined;}
const memory:SnapshotMemoryState=globalThis.emw3TestingSnapshotMemoryV2??={scoped:new VersionedSnapshotMemory<TestingDataSnapshot>(),latest:new VersionedSnapshotMemory<TestingDataSnapshot>(),versions:new Map(),loads:new Map(),emptyLatest:new Set()};
memory.loads??=new Map();
memory.emptyLatest??=new Set();
const memoryKey=(channel:TestingDataChannel,input:TestingDataInput)=>JSON.stringify([channel,testingDataSnapshotKey(channel,input)]);
function remember<T>(channel:TestingDataChannel,input:TestingDataInput,snapshot:TestingDataSnapshot<T>|null,knownLatest=true){
 const key=memoryKey(channel,input);
 if(!snapshot){memory.scoped.delete(key);return null;}
 const current=memory.scoped.set(key,snapshot) as TestingDataSnapshot<T>;
 if(knownLatest||memory.latest.get(channel)){memory.latest.set(channel,current);memory.emptyLatest.delete(channel);}
 ensureSnapshotCheck();return current;
}

function database(){
 const connectionString=process.env.KLAVIYO_DATABASE_URL?.trim();
 if(!connectionString)throw Error('Shared data cache is not configured.');
 return pool??=new Pool({connectionString,ssl:{rejectUnauthorized:false},max:4,connectionTimeoutMillis:5000});
}
async function loadScope<T>(channel:TestingDataChannel,scope:string):Promise<TestingDataSnapshot<T>|null>{
 const key=JSON.stringify([channel,scope]),existing=memory.loads.get(key);
 if(existing)return existing as Promise<TestingDataSnapshot<T>|null>;
 const request=(async()=>{
  const result=await database().query<{payload:T;updated_at:Date|string}>('select payload,updated_at from testing_data_snapshots where channel=$1 and scope_key=$2',[channel,scope]);
  const row=result.rows[0];return row?{payload:row.payload,updatedAt:new Date(row.updated_at).toISOString()}:null;
 })();
 memory.loads.set(key,request);
 void request.finally(()=>{if(memory.loads.get(key)===request)memory.loads.delete(key);}).catch(()=>{});
 return request;
}
async function loadLatest<T>(channel:TestingDataChannel):Promise<TestingDataSnapshot<T>|null>{
 const result=await database().query<{payload:T;updated_at:Date|string}>('select payload,updated_at from testing_data_snapshots where channel=$1 order by updated_at desc limit 1',[channel]);
 const row=result.rows[0];return row?{payload:row.payload,updatedAt:new Date(row.updated_at).toISOString()}:null;
}

/** Return process memory immediately; cold misses wait for the shared snapshot. */
export async function readTestingDataSnapshot<T=unknown>(channel:TestingDataChannel,input:TestingDataInput={}):Promise<TestingDataSnapshot<T>|null>{
 const key=memoryKey(channel,input),cached=memory.scoped.get(key);if(cached)return cached as TestingDataSnapshot<T>;
 if(Date.now()<unavailableUntil)return null;
 try{
  const snapshot=await memory.scoped.read(key,()=>loadScope(channel,testingDataSnapshotKey(channel,input)));
  if(snapshot)ensureSnapshotCheck();
  return snapshot as TestingDataSnapshot<T>|null;
 }catch{unavailableUntil=Date.now()+10000;return memory.scoped.get(key) as TestingDataSnapshot<T>??null;}
}
export async function readRequiredTestingDataSnapshot<T=unknown>(channel:TestingDataChannel,input:TestingDataInput={}):Promise<TestingDataSnapshot<T>|null>{
 const key=memoryKey(channel,input),snapshot=await memory.scoped.fetch(key,()=>loadScope(channel,testingDataSnapshotKey(channel,input)));
 if(snapshot)ensureSnapshotCheck();
 return snapshot as TestingDataSnapshot<T>|null;
}
/** Reuse the newest known scope; a cold miss reads the shared database. */
export async function readLatestTestingDataSnapshot<T=unknown>(channel:TestingDataChannel):Promise<TestingDataSnapshot<T>|null>{
 try{
  const snapshot=await memory.latest.read(channel,()=>loadLatest(channel));
  if(snapshot){memory.emptyLatest.delete(channel);ensureSnapshotCheck();}else memory.emptyLatest.add(channel);
  return snapshot as TestingDataSnapshot<T>|null;
 }catch{
  if(memory.emptyLatest.has(channel))return null;
  const cached=memory.latest.get(channel);if(cached)return cached as TestingDataSnapshot<T>;
  const candidates=memory.scoped.keys().flatMap(key=>{try{if(JSON.parse(key)[0]!==channel)return [];const value=memory.scoped.get(key);return value?[value]:[];}catch{return [];}});
  return candidates.reduce<TestingDataSnapshot|null>((latest,item)=>!latest||Date.parse(item.updatedAt)>Date.parse(latest.updatedAt)?item:latest,null) as TestingDataSnapshot<T>|null;
 }
}

export type TestingSnapshotVersionScope={channel:TestingDataChannel;input?:TestingDataInput;latest?:boolean};
export function readRememberedSnapshotVersionEntries():{channel:TestingDataChannel;scopeKey:string;updatedAt:string}[]{
 return memory.scoped.keys().flatMap(key=>{
  try{const [channel,scopeKey]=JSON.parse(key) as [TestingDataChannel,string];const value=memory.scoped.get(key);return value?[{channel,scopeKey,updatedAt:value.updatedAt}]:[];}catch{return [];}
 });
}
/** Capture before page data is read so a concurrent update cannot be missed. */
export function readRememberedSnapshotVersions(scopes:readonly TestingSnapshotVersionScope[]):(string|null)[]{
 return scopes.map(({channel,input,latest})=>{
  const value=latest?memory.latest.get(channel):memory.scoped.get(memoryKey(channel,input??{}));
  return value?.updatedAt??null;
 });
}
/** A single lightweight query covers exact scopes and the latest scope per channel. */
export async function readTestingSnapshotVersions(scopes:readonly TestingSnapshotVersionScope[]):Promise<(string|null)[]>{
 if(!scopes.length)return [];
 const normalized=scopes.map(({channel,input,latest})=>({channel,scope:testingDataSnapshotKey(channel,input),latest:Boolean(latest)}));
 const requestKey=JSON.stringify(normalized),pending=memory.versions.get(requestKey);
 if(pending)return pending;
 const request=(async()=>{
  const observed=normalized.map(item=>item.latest?memory.latest.get(item.channel):memory.scoped.get(JSON.stringify([item.channel,item.scope])));
  const rows=await querySnapshotVersions((sql,values)=>database().query(sql,values),normalized);
  const versions=rows.map(row=>row.updatedAt);
  await Promise.all(normalized.map(async(item,index)=>{
   const version=versions[index]??null;
   const cache=item.latest?memory.latest:memory.scoped;
   const key=item.latest?item.channel:JSON.stringify([item.channel,item.scope]);
   const old=cache.get(key);if(old!==observed[index])return;
   if(item.latest){if(version===null)memory.emptyLatest.add(item.channel);else memory.emptyLatest.delete(item.channel);}
   if(!old)return;
   const scope=item.latest?rows[index]?.scope:item.scope;
   await cache.reconcile(key,version,()=>scope?loadScope(item.channel,scope):loadLatest(item.channel));
   const current=cache.get(key);
   // Do not report a new version to the browser until the corresponding data is ready.
   if(version&&current===old&&Date.parse(current.updatedAt)!==Date.parse(version))throw Error('Published testing snapshot could not be loaded.');
   if(current&&!item.latest&&memory.latest.get(item.channel))memory.latest.set(item.channel,current);
  }));
  return versions;
 })();
 memory.versions.set(requestKey,request);
 void request.finally(()=>{if(memory.versions.get(requestKey)===request)memory.versions.delete(requestKey);}).catch(()=>{});
 return request;
}

/** One unref'ed timer per process checks only cached scopes; errors keep cached data. */
function ensureSnapshotCheck(){
 if(memory.timer)return;
 memory.timer=setInterval(()=>{
  if(memory.checking)return;
  const exact=memory.scoped.keys().flatMap(key=>{
   try{const [channel,scope]=JSON.parse(key) as [TestingDataChannel,string];return [{channel,scope,latest:false as const}];}catch{return [];}
  });
  const latest=memory.latest.keys().map(channel=>({channel:channel as TestingDataChannel,scope:'',latest:true as const}));
  if(!exact.length&&!latest.length){clearInterval(memory.timer);memory.timer=undefined;return;}
  // Already-normalized scope keys must not be passed through the period resolver again.
  const check=checkCachedVersions(exact,latest);
  memory.checking=check;
  void check.finally(()=>{if(memory.checking===check)memory.checking=undefined;}).catch(()=>{});
 },30000);
 memory.timer.unref?.();
}

async function checkCachedVersions(exact:{channel:TestingDataChannel;scope:string;latest:false}[],latest:{channel:TestingDataChannel;scope:string;latest:true}[]){
 const all=[...exact,...latest];
 const observed=all.map(item=>item.latest?memory.latest.get(item.channel):memory.scoped.get(JSON.stringify([item.channel,item.scope])));
 const rows=await querySnapshotVersions((sql,values)=>database().query(sql,values),all);
 await Promise.all(all.map(async(item,index)=>{
  const version=rows[index]?.updatedAt??null;
  const cache=item.latest?memory.latest:memory.scoped,key=item.latest?item.channel:JSON.stringify([item.channel,item.scope]);
  if(cache.get(key)!==observed[index])return;
  if(item.latest){if(version===null)memory.emptyLatest.add(item.channel);else memory.emptyLatest.delete(item.channel);}
  const scope=item.latest?rows[index]?.scope:item.scope;
  await cache.reconcile(key,version,()=>scope?loadScope(item.channel,scope):loadLatest(item.channel));
  const current=cache.get(key);if(current&&!item.latest&&memory.latest.get(item.channel))memory.latest.set(item.channel,current);
 }));
}
/** Poll only lightweight metadata, never download the full Google payload just to show its time. */
export async function readTestingDataSnapshotStatus(channel:TestingDataChannel,input:TestingDataInput={}){
 const key=memoryKey(channel,input),observed=memory.scoped.get(key);
 const result=await database().query<{updated_at:Date|string;captured_at:string|null}>(`select updated_at,case when channel='social' then payload->>'capturedAt' else null end captured_at from testing_data_snapshots where channel=$1 and scope_key=$2`,[channel,testingDataSnapshotKey(channel,input)]);
 const row=result.rows[0];
 // A concurrent local publication wins over the earlier metadata query.
 if(memory.scoped.get(key)!==observed){const current=memory.scoped.get(key);return current?{updatedAt:current.updatedAt,sourceUpdatedAt:null}:null;}
 if(!row){await memory.scoped.reconcile(key,null,()=>loadScope(channel,testingDataSnapshotKey(channel,input)));return null;}
 const updatedAt=new Date(row.updated_at).toISOString();
 await memory.scoped.reconcile(key,updatedAt,()=>loadScope(channel,testingDataSnapshotKey(channel,input)));
 const current=memory.scoped.get(key);
 if(current&&current===observed&&Date.parse(current.updatedAt)!==Date.parse(updatedAt))throw Error('Published testing snapshot could not be loaded.');
 if(current&&memory.latest.get(channel))memory.latest.set(channel,current);
 return {updatedAt,sourceUpdatedAt:row.captured_at&&Number.isFinite(Date.parse(row.captured_at))?new Date(row.captured_at).toISOString():null};
}
/** The transaction lock works with transaction-pooled Postgres connections across app instances. */
export async function publishTestingDataSnapshot<T>(channel:TestingDataChannel,input:TestingDataInput,load:()=>Promise<T>,options?:TestingDataPublishOptions):Promise<TestingDataSnapshot<T>&{skipped:boolean}>{
 const client=await database().connect();
 try{const result=await publishTestingData((sql,values)=>client.query(sql,values),channel,testingDataSnapshotKey(channel,input),load,options);const snapshot={payload:result.payload as T,updatedAt:result.updatedAt,skipped:result.skipped};remember(channel,input,snapshot,!result.skipped);return snapshot;}
 finally{client.release();}
}
export async function isTestingDataRefreshRunning(channel:TestingDataChannel,input:TestingDataInput={}):Promise<boolean>{
 const client=await database().connect(),key=testingDataSnapshotKey(channel,input);
 try{await client.query('begin');const result=await client.query<{locked:boolean}>('select pg_try_advisory_xact_lock(hashtext($1),hashtext($2)) as locked',[`testing-data:${channel}`,key]);await client.query('commit');return !result.rows[0]?.locked;}catch(error){await client.query('rollback').catch(()=>{});throw error;}finally{client.release();}
}

/** All Google channel refresh controls publish the same atomic batch. */
export async function publishGoogleTestingSnapshots(load:(channel:'google-search'|'google-pmax'|'google-demand-gen')=>Promise<unknown>){
 const {publishGoogleTestingData}=await import('./testing-data-publication');
 const client=await database().connect();
 try{const loaded=new Map<'google-search'|'google-pmax'|'google-demand-gen',unknown>();const result=await publishGoogleTestingData((sql,values)=>client.query(sql,values),async channel=>{const payload=await load(channel);loaded.set(channel,payload);return payload;});for(const [channel,payload] of loaded)remember(channel,{}, {payload,updatedAt:result.updatedAt});return result;}finally{client.release();}
}

/** Fill a missing scope once, recording only a complete, uncached source read. */
export async function initializeTestingDataSnapshot<T>(channel:TestingDataChannel,input:TestingDataInput,load:()=>Promise<T>):Promise<TestingDataSnapshot<T>|null>{
 let sourceStarted=false;
 try{return await publishTestingDataSnapshot(channel,input,async()=>{sourceStarted=true;return load();},{reuseExisting:true});}
 catch(error){if(sourceStarted)throw error;return readTestingDataSnapshot<T>(channel,input);}
}
