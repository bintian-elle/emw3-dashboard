import {instagramPostCodes} from './instagram-posts.ts';
import {isCompleteSocialSnapshot} from './testing-social-snapshot.ts';

export type SocialCoverageQuery=(sql:string,values?:unknown[])=>Promise<{rows:Array<Record<string,unknown>>}>;
export type SocialCoverageResult={status:'complete'|'updated'|'busy'|'cooldown'|'failed';limited?:boolean};
const attemptChannel='social-coverage-attempt',signature=instagramPostCodes.join(',');

/** A cross-process lock and shared cooldown protect Meta and preserve the last good snapshot. */
export async function repairSocialCoverage(query:SocialCoverageQuery,load:()=>Promise<unknown>,prepare:(payload:unknown)=>unknown=payload=>payload):Promise<SocialCoverageResult>{
 await query('begin');
 try{
  const lock=await query('select pg_try_advisory_xact_lock(hashtext($1),hashtext($2)) as locked',['testing-data:social','all']);
  if(!lock.rows[0]?.locked){await query('rollback');return {status:'busy'};}
  const existing=await query('select payload from testing_data_snapshots where channel=$1 and scope_key=$2',['social','all']);
  if(isCompleteSocialSnapshot(existing.rows[0]?.payload)){await query('commit');return {status:'complete'};}
  const prior=await query("select payload,updated_at>clock_timestamp()-interval '5 minutes' as recent from testing_data_snapshots where channel=$1 and scope_key=$2",[attemptChannel,'all']);
  const last=prior.rows[0]?.payload as {signature?:string;status?:string;limited?:boolean}|undefined;
  if(prior.rows[0]?.recent&&last?.signature===signature&&last.status==='failed'){
   await query('commit');return {status:'cooldown',limited:!!last.limited};
  }
  let fresh:unknown;
  try{fresh=await load();if(!isCompleteSocialSnapshot(fresh))throw Error('Incomplete Social data');}
  catch(error){
   const limited=error instanceof Error&&/\b429\b|rate.?limit|too many requests/i.test(error.message);
   await query(`insert into testing_data_snapshots(channel,scope_key,payload,updated_at) values($1,$2,$3::jsonb,clock_timestamp()) on conflict(channel,scope_key) do update set payload=excluded.payload,updated_at=excluded.updated_at`,[attemptChannel,'all',JSON.stringify({signature,status:'failed',limited})]);
   await query('commit');return {status:'failed',limited};
  }
  await query(`insert into testing_data_snapshots(channel,scope_key,payload,updated_at) values($1,$2,$3::jsonb,clock_timestamp()) on conflict(channel,scope_key) do update set payload=excluded.payload,updated_at=excluded.updated_at`,['social','all',JSON.stringify(prepare(fresh))]);
  await query(`insert into testing_data_snapshots(channel,scope_key,payload,updated_at) values($1,$2,$3::jsonb,clock_timestamp()) on conflict(channel,scope_key) do update set payload=excluded.payload,updated_at=excluded.updated_at`,[attemptChannel,'all',JSON.stringify({signature,status:'complete',limited:false})]);
  await query('commit');return {status:'updated'};
 }catch(error){await query('rollback').catch(()=>{});throw error;}
}
