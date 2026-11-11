import {dashboardOwner} from '@/lib/ai-dashboard-access';
import {isTestingDataRefreshRunning,readTestingDataSnapshotStatus,withTestingDataClient} from '@/lib/testing-data-cache';
import {instagramPostCodes} from '@/lib/instagram-posts';
import {isCompleteSocialSnapshot} from '@/lib/testing-social-snapshot';

const headers={'Cache-Control':'private, no-store'};
export async function GET(request:Request){
 try{await dashboardOwner(request);}catch{return Response.json({error:'Unauthorized'},{status:401,headers});}
 try{
  if(await isTestingDataRefreshRunning('social'))return Response.json({status:'loading'},{headers});
  const state=await withTestingDataClient(async client=>{
   const result=await client.query(`select current.payload as current, attempt.payload as attempt,
    attempt.updated_at>clock_timestamp()-interval '5 minutes' as recent
    from (select 1) one
    left join testing_data_snapshots current on current.channel='social' and current.scope_key='all'
    left join testing_data_snapshots attempt on attempt.channel='social-coverage-attempt' and attempt.scope_key='all'`);
   return result.rows[0] as {current:unknown;attempt?:{signature?:string;status?:string;limited?:boolean};recent:boolean};
  });
  if(isCompleteSocialSnapshot(state.current)){await readTestingDataSnapshotStatus('social');return Response.json({status:'complete'},{headers});}
  if(state.attempt?.status==='failed'&&state.attempt.signature===instagramPostCodes.join(','))return Response.json({status:state.recent?(state.attempt.limited?'rate_limited':'failed'):'retry'},{headers});
  return Response.json({status:'loading'},{headers});
 }catch{return Response.json({status:'unavailable'},{status:503,headers});}
}
