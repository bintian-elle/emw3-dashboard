export class TestingDataRefreshBusy extends Error {constructor(){super('A refresh is already in progress. Please try again shortly.');}}
export class TestingDataRefreshRateLimit extends Error {constructor(){super('Please wait a moment before refreshing again.');}}
type Row=Record<string,unknown>;
export type TestingDataQuery=(sql:string,values?:unknown[])=>Promise<{rows:Row[]}>;
export type TestingDataPublishOptions={skipValidToday?:(payload:unknown)=>boolean;reuseExisting?:boolean};
/** Keep the old snapshot and its timestamp until every upstream request succeeds. */
export async function publishTestingData(query:TestingDataQuery,channel:string,key:string,load:()=>Promise<unknown>,options:TestingDataPublishOptions={}){
 try{
  await query('begin');
  const lock=await query('select pg_try_advisory_xact_lock(hashtext($1),hashtext($2)) as locked',[`testing-data:${channel}`,key]);
  if(!lock.rows[0]?.locked)throw new TestingDataRefreshBusy();
  const previous=await query(options.reuseExisting
   ? "select updated_at,payload from testing_data_snapshots where channel=$1 and scope_key=$2"
   : options.skipValidToday
   ? "select updated_at, payload, updated_at > clock_timestamp()-interval '30 seconds' as recent, updated_at >= (date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC') and updated_at < ((date_trunc('day',clock_timestamp() at time zone 'UTC') + interval '1 day') at time zone 'UTC') as utc_today from testing_data_snapshots where channel=$1 and scope_key=$2"
   : "select updated_at > clock_timestamp()-interval '30 seconds' as recent from testing_data_snapshots where channel=$1 and scope_key=$2",[channel,key]);
  const existing=previous.rows[0];
  if((options.reuseExisting&&existing)||(existing?.utc_today&&options.skipValidToday?.(existing.payload))){
   const updatedAt=new Date(existing.updated_at as Date|string).toISOString();
   await query('commit');
   return {payload:existing.payload,updatedAt,skipped:true};
  }
  if(existing?.recent)throw new TestingDataRefreshRateLimit();
  const payload=await load();
  if(payload==null)throw Error('The data source returned no report.');
  const result=await query(`insert into testing_data_snapshots(channel,scope_key,payload,updated_at) values($1,$2,$3::jsonb,clock_timestamp()) on conflict(channel,scope_key) do update set payload=excluded.payload,updated_at=excluded.updated_at returning updated_at`,[channel,key,JSON.stringify(payload)]);
  await query('commit');
  return {payload,updatedAt:new Date(result.rows[0].updated_at as Date|string).toISOString(),skipped:false};
 }catch(error){await query('rollback').catch(()=>{});throw error;}
}

export const googleSnapshotChannels=['google-search','google-pmax','google-demand-gen'] as const;
/** One Google batch: all three locks, payloads and timestamps commit together. */
export async function publishGoogleTestingData(query:TestingDataQuery,load:(channel:typeof googleSnapshotChannels[number])=>Promise<unknown>){
 try{
  await query('begin');
  for(const channel of googleSnapshotChannels){
   const lock=await query('select pg_try_advisory_xact_lock(hashtext($1),hashtext($2)) as locked',[`testing-data:${channel}`,'all']);
   if(!lock.rows[0]?.locked)throw new TestingDataRefreshBusy();
   const previous=await query("select updated_at > clock_timestamp()-interval '30 seconds' as recent from testing_data_snapshots where channel=$1 and scope_key=$2",[channel,'all']);
   if(previous.rows[0]?.recent)throw new TestingDataRefreshRateLimit();
  }
  const payloads=[];
  // Serialize upstream discovery to avoid a burst against the same Google account.
  for(const channel of googleSnapshotChannels){const payload=await load(channel);if(payload==null)throw Error('Google returned no report.');payloads.push({channel,payload});}
  const clock=await query('select clock_timestamp() as updated_at');
  const updatedAt=new Date(clock.rows[0].updated_at as Date|string).toISOString();
  for(const {channel,payload} of payloads)await query(`insert into testing_data_snapshots(channel,scope_key,payload,updated_at) values($1,$2,$3::jsonb,$4::timestamptz) on conflict(channel,scope_key) do update set payload=excluded.payload,updated_at=excluded.updated_at`,[channel,'all',JSON.stringify(payload),updatedAt]);
  await query('commit');return {updatedAt,skipped:false};
 }catch(error){await query('rollback').catch(()=>{});throw error;}
}
