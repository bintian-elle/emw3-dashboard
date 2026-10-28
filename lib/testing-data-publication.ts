export class TestingDataRefreshBusy extends Error {constructor(){super('A refresh is already in progress. Please try again shortly.');}}
export class TestingDataRefreshRateLimit extends Error {constructor(){super('Please wait a moment before refreshing again.');}}
type Row=Record<string,unknown>;
export type TestingDataQuery=(sql:string,values?:unknown[])=>Promise<{rows:Row[]}>;
export type TestingDataPublishOptions={skipValidToday?:(payload:unknown)=>boolean};
/** Keep the old snapshot and its timestamp until every upstream request succeeds. */
export async function publishTestingData(query:TestingDataQuery,channel:string,key:string,load:()=>Promise<unknown>,options:TestingDataPublishOptions={}){
 try{
  await query('begin');
  const lock=await query('select pg_try_advisory_xact_lock(hashtext($1),hashtext($2)) as locked',[`testing-data:${channel}`,key]);
  if(!lock.rows[0]?.locked)throw new TestingDataRefreshBusy();
  const previous=await query(options.skipValidToday
   ? "select updated_at, payload, updated_at > clock_timestamp()-interval '30 seconds' as recent, updated_at >= (date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC') and updated_at < ((date_trunc('day',clock_timestamp() at time zone 'UTC') + interval '1 day') at time zone 'UTC') as utc_today from testing_data_snapshots where channel=$1 and scope_key=$2"
   : "select updated_at > clock_timestamp()-interval '30 seconds' as recent from testing_data_snapshots where channel=$1 and scope_key=$2",[channel,key]);
  const existing=previous.rows[0];
  if(existing?.utc_today&&options.skipValidToday?.(existing.payload)){
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
