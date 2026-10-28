import 'server-only';
import {Pool} from 'pg';
import {testingDataSnapshotKey,type TestingDataChannel,type TestingDataInput} from './testing-data-cache-contract';
import {publishTestingData,type TestingDataPublishOptions} from './testing-data-publication';
export {TestingDataRefreshBusy,TestingDataRefreshRateLimit} from './testing-data-publication';

export type TestingDataSnapshot<T=unknown>={payload:T;updatedAt:string};
let pool:Pool|undefined;
let unavailableUntil=0;
declare global {var emw3TestingSnapshotMemory:Map<string,{snapshot:TestingDataSnapshot;expires:number}>|undefined;}
const memory=globalThis.emw3TestingSnapshotMemory??=new Map<string,{snapshot:TestingDataSnapshot;expires:number}>();
const memoryKey=(channel:TestingDataChannel,input:TestingDataInput)=>JSON.stringify([channel,testingDataSnapshotKey(channel,input)]);
function remember<T>(channel:TestingDataChannel,input:TestingDataInput,snapshot:TestingDataSnapshot<T>|null){
 const key=memoryKey(channel,input),previous=memory.get(key);
 if(snapshot&&previous&&Date.parse(previous.snapshot.updatedAt)>Date.parse(snapshot.updatedAt))return previous.snapshot as TestingDataSnapshot<T>;
 memory.delete(key);
 if(snapshot){if(memory.size>=256)memory.delete(memory.keys().next().value!);memory.set(key,{snapshot,expires:Date.now()+300000});}return snapshot;
}

function database(){
 const connectionString=process.env.KLAVIYO_DATABASE_URL?.trim();
 if(!connectionString)throw Error('Shared data cache is not configured.');
 return pool??=new Pool({connectionString,ssl:{rejectUnauthorized:false},max:4,connectionTimeoutMillis:5000});
}
/** Read a published snapshot; existing page data remains the fallback if none exists. */
export async function readTestingDataSnapshot<T=unknown>(channel:TestingDataChannel,input:TestingDataInput={}):Promise<TestingDataSnapshot<T>|null>{
 const cached=memory.get(memoryKey(channel,input));if(cached&&cached.expires>Date.now())return cached.snapshot as TestingDataSnapshot<T>;
 if(Date.now()<unavailableUntil)return cached?.snapshot as TestingDataSnapshot<T>??null;
 try{return await readRequiredTestingDataSnapshot<T>(channel,input);}catch{unavailableUntil=Date.now()+10000;return cached?.snapshot as TestingDataSnapshot<T>??null;}
}
export async function readRequiredTestingDataSnapshot<T=unknown>(channel:TestingDataChannel,input:TestingDataInput={}):Promise<TestingDataSnapshot<T>|null>{
 const result=await database().query<{payload:T;updated_at:Date|string}>('select payload,updated_at from testing_data_snapshots where channel=$1 and scope_key=$2',[channel,testingDataSnapshotKey(channel,input)]);
 const row=result.rows[0];return remember(channel,input,row?{payload:row.payload,updatedAt:new Date(row.updated_at).toISOString()}:null);
}
/** Poll only lightweight metadata, never download the full Google payload just to show its time. */
export async function readTestingDataSnapshotStatus(channel:TestingDataChannel,input:TestingDataInput={}){
 const result=await database().query<{updated_at:Date|string;captured_at:string|null}>(`select updated_at,case when channel='social' then payload->>'capturedAt' else null end captured_at from testing_data_snapshots where channel=$1 and scope_key=$2`,[channel,testingDataSnapshotKey(channel,input)]);
 const row=result.rows[0],key=memoryKey(channel,input);
 if(!row){memory.delete(key);return null;}
 const updatedAt=new Date(row.updated_at).toISOString(),cached=memory.get(key);
 if(cached&&Date.parse(cached.snapshot.updatedAt)<Date.parse(updatedAt))memory.delete(key);
 return {updatedAt,sourceUpdatedAt:row.captured_at&&Number.isFinite(Date.parse(row.captured_at))?new Date(row.captured_at).toISOString():null};
}
/** The transaction lock works with transaction-pooled Postgres connections across app instances. */
export async function publishTestingDataSnapshot<T>(channel:TestingDataChannel,input:TestingDataInput,load:()=>Promise<T>,options?:TestingDataPublishOptions):Promise<TestingDataSnapshot<T>&{skipped:boolean}>{
 const client=await database().connect();
 try{const result=await publishTestingData((sql,values)=>client.query(sql,values),channel,testingDataSnapshotKey(channel,input),load,options);const snapshot={payload:result.payload as T,updatedAt:result.updatedAt,skipped:result.skipped};remember(channel,input,snapshot);return snapshot;}
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
