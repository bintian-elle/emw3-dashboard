import {socialMetrics,type SocialPost} from './instagram-posts.ts';

type PaidPost=Pick<SocialPost,'code'|'paid'>;
type Range={start:string;end:string};
type Cache={version:1;start:string;end:string;sourceVersion:string|null;posts:PaidPost[]};
export type PaidCacheQuery=(sql:string,values?:unknown[])=>Promise<{rows:Array<Record<string,unknown>>}>;
export type PaidPeriodResult={posts:PaidPost[];stale:boolean;limited?:boolean};
const channel='social-paid-period';
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const asVersion=(value:unknown)=>value==null?null:new Date(value as string|Date).toISOString();

function validPosts(value:unknown,codes:readonly string[]):value is PaidPost[]{
 if(!Array.isArray(value)||value.length!==codes.length)return false;
 const expected=new Set(codes),seen=new Set<string>();
 for(const row of value){
  if(!object(row)||typeof row.code!=='string'||!expected.has(row.code)||seen.has(row.code)||!object(row.paid)||row.paid.status!=='available'||!Number.isInteger(row.paid.adCount)||Number(row.paid.adCount)<0||!object(row.paid.metrics))return false;
  const metrics=row.paid.metrics;
  if(!socialMetrics.every(key=>key in metrics&&(metrics[key]===null||(typeof metrics[key]==='number'&&Number.isFinite(metrics[key])&&metrics[key]>=0))))return false;
  seen.add(row.code);
 }
 return true;
}
function validCache(value:unknown,range:Range,codes:readonly string[]):value is Cache{
 return object(value)&&value.version===1&&value.start===range.start&&value.end===range.end&&(value.sourceVersion===null||typeof value.sourceVersion==='string')&&validPosts(value.posts,codes);
}
async function read(query:PaidCacheQuery,scope:string,range:Range,codes:readonly string[]){
 const result=await query(`select cache.payload, source.updated_at as source_version
  from (select 1) as one
  left join testing_data_snapshots cache on cache.channel='social-paid-period' and cache.scope_key=$1
  left join testing_data_snapshots source on source.channel='social' and source.scope_key='all'`,[scope]);
 const row=result.rows[0];if(!row)throw Error('Social cache lookup failed');
 return {cache:validCache(row.payload,range,codes)?row.payload:null,version:asVersion(row.source_version)};
}
/** Cache by exact period and post set; a failed refresh never replaces the previous result. */
export async function readOrFetchSocialPaid(query:PaidCacheQuery,scope:string,range:Range,codes:readonly string[],load:()=>Promise<PaidPost[]>):Promise<PaidPeriodResult>{
 let previous=await read(query,scope,range,codes);
 if(previous.cache&&previous.cache.sourceVersion===previous.version)return {posts:previous.cache.posts,stale:false};
 let inTransaction=false;
 try{
  await query('begin');inTransaction=true;
  await query('select pg_advisory_xact_lock(hashtext($1),hashtext($2))',[`testing-data:${channel}`,scope]);
  previous=await read(query,scope,range,codes);
  if(previous.cache&&previous.cache.sourceVersion===previous.version){await query('commit');inTransaction=false;return {posts:previous.cache.posts,stale:false};}
  const raw=await load();
  if(!validPosts(raw,codes))throw Error('Incomplete Social Paid data');
  const posts=raw.map(({code,paid})=>({code,paid}));
  const payload:Cache={version:1,...range,sourceVersion:previous.version,posts};
  await query(`insert into testing_data_snapshots(channel,scope_key,payload,updated_at) values($1,$2,$3::jsonb,clock_timestamp()) on conflict(channel,scope_key) do update set payload=excluded.payload,updated_at=excluded.updated_at`,[channel,scope,JSON.stringify(payload)]);
  await query('commit');inTransaction=false;
  return {posts,stale:false};
 }catch(error){
  if(inTransaction)await query('rollback').catch(()=>{});
  if(previous.cache)return {posts:previous.cache.posts,stale:true,limited:error instanceof Error&&/rate limit|429/i.test(error.message)};
  throw error;
 }
}
