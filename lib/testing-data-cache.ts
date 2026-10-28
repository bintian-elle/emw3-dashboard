import 'server-only';
import {Pool} from 'pg';
import {testingDataSnapshotKey,type TestingDataChannel,type TestingDataInput} from './testing-data-cache-contract';
import {publishTestingData,type TestingDataPublishOptions} from './testing-data-publication';
export {TestingDataRefreshBusy,TestingDataRefreshRateLimit} from './testing-data-publication';

export type TestingDataSnapshot<T=unknown>={payload:T;updatedAt:string};
let pool:Pool|undefined;
let unavailableUntil=0;
function database(){
 const connectionString=process.env.KLAVIYO_DATABASE_URL?.trim();
 if(!connectionString)throw Error('Shared data cache is not configured.');
 return pool??=new Pool({connectionString,ssl:{rejectUnauthorized:false},max:4,connectionTimeoutMillis:5000});
}
/** Read a published snapshot; existing page data remains the fallback if none exists. */
export async function readTestingDataSnapshot<T=unknown>(channel:TestingDataChannel,input:TestingDataInput={}):Promise<TestingDataSnapshot<T>|null>{
 if(Date.now()<unavailableUntil)return null;
 try{return await readRequiredTestingDataSnapshot<T>(channel,input);}catch{unavailableUntil=Date.now()+10000;return null;}
}
export async function readRequiredTestingDataSnapshot<T=unknown>(channel:TestingDataChannel,input:TestingDataInput={}):Promise<TestingDataSnapshot<T>|null>{
 const result=await database().query<{payload:T;updated_at:Date|string}>('select payload,updated_at from testing_data_snapshots where channel=$1 and scope_key=$2',[channel,testingDataSnapshotKey(channel,input)]);
 const row=result.rows[0];return row?{payload:row.payload,updatedAt:new Date(row.updated_at).toISOString()}:null;
}
/** The transaction lock works with transaction-pooled Postgres connections across app instances. */
export async function publishTestingDataSnapshot<T>(channel:TestingDataChannel,input:TestingDataInput,load:()=>Promise<T>,options?:TestingDataPublishOptions):Promise<TestingDataSnapshot<T>&{skipped:boolean}>{
 const client=await database().connect();
 try{const result=await publishTestingData((sql,values)=>client.query(sql,values),channel,testingDataSnapshotKey(channel,input),load,options);return {payload:result.payload as T,updatedAt:result.updatedAt,skipped:result.skipped};}
 finally{client.release();}
}
export async function isTestingDataRefreshRunning(channel:TestingDataChannel,input:TestingDataInput={}):Promise<boolean>{
 const client=await database().connect(),key=testingDataSnapshotKey(channel,input);
 try{await client.query('begin');const result=await client.query<{locked:boolean}>('select pg_try_advisory_xact_lock(hashtext($1),hashtext($2)) as locked',[`testing-data:${channel}`,key]);await client.query('commit');return !result.rows[0]?.locked;}catch(error){await client.query('rollback').catch(()=>{});throw error;}finally{client.release();}
}
