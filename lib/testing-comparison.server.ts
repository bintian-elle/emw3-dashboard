import 'server-only';
import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {Pool} from 'pg';
import {readTestingDataSnapshot,restoreTestingMaterials} from './testing-data-cache';
import type {TestingDataChannel} from './testing-data-cache-contract';
import type {ComparisonRange} from './testing-comparison';
let pool:Pool|undefined;
const seeds=new Map<string,Promise<Map<string,unknown>>>();
function seedPeriods(directory:string){
 let pending=seeds.get(directory);if(pending)return pending;
 pending=(async()=>{const index=new Map<string,unknown>(),versions=new Map<string,number>();for(const file of await readdir(directory)){if(!file.endsWith('.json'))continue;try{const value=JSON.parse(await readFile(join(directory,file),'utf8')),data=value.payload?.data,period=data?.period;if(period?.start&&period?.end){const key=JSON.stringify([value.channel,period.start,period.end]),version=Date.parse(value.updatedAt);if(!versions.has(key)||version>versions.get(key)!){index.set(key,data);versions.set(key,version);}}}catch{/* Ignore non-snapshot files. */}}return index;})();
 seeds.set(directory,pending);void pending.catch(()=>seeds.delete(directory));return pending;
}
/** Exact published periods only. No upstream calls and no latest-period fallback. */
export async function readComparisonPeriod(channel:TestingDataChannel,range:ComparisonRange):Promise<unknown|null>{
 const directory=process.env.STAGING_DATA_SNAPSHOT_DIR;
 if(directory){const data=(await seedPeriods(directory)).get(JSON.stringify([channel,range.start,range.end]));if(data)return data;}
 const connectionString=process.env.KLAVIYO_DATABASE_URL?.trim();
 if(!connectionString)return null;
 pool??=new Pool({connectionString,ssl:{rejectUnauthorized:false},max:2,connectionTimeoutMillis:5000,statement_timeout:5000});
 try{const result=await pool.query('SELECT payload FROM testing_data_snapshots WHERE channel=$1 AND payload #>> \'{data,period,start}\'=$2 AND payload #>> \'{data,period,end}\'=$3 ORDER BY updated_at DESC LIMIT 1',[channel,range.start,range.end]);return result.rows[0]?.payload?restoreTestingMaterials(channel,result.rows[0].payload).data??null:null;}catch{return null;}
}
export async function hasComparisonGoogleSnapshot(channel:TestingDataChannel,range:ComparisonRange){
 try{const stored=await readTestingDataSnapshot<{end?:string;performance?:{start?:string;end?:string}}>(channel,{}),payload=stored?.payload;if(!payload)return false;const start=payload.performance?.start??'2025-01-01',end=payload.performance?.end??payload.end;return Boolean(end&&range.start>=start&&range.end<=end);}catch{return false;}
}
