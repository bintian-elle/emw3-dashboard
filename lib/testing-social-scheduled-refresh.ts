import {TestingDataRefreshBusy,TestingDataRefreshRateLimit} from './testing-data-publication.ts';

const headers={'Cache-Control':'private, no-store'};

/** The scheduled endpoint accepts service credentials only, and publishes no partial result. */
export async function handleScheduledSocialRefresh(request:Request,secret:string|undefined,refresh:()=>Promise<{updatedAt:string;skipped?:boolean}>,revalidate:()=>void){
 const credential=secret?.trim();
 if(!credential)return Response.json({error:'An internal refresh secret is not configured.'},{status:503,headers});
 if(request.headers.get('authorization')!==`Bearer ${credential}`)return Response.json({error:'Unauthorized'},{status:401,headers});
 try{
  const result=await refresh();
  // A revalidation error cannot undo an already committed snapshot.
  if(!result.skipped)try{revalidate();}catch{/* Clients also poll the shared update time. */}
  return Response.json({updatedAt:result.updatedAt,skipped:result.skipped===true},{headers});
 }catch(error){
  const message=error instanceof Error?error.message:'';
  const limited=error instanceof TestingDataRefreshBusy||error instanceof TestingDataRefreshRateLimit||/\b429\b|rate.?limit|too many requests/i.test(message);
  return Response.json({error:limited?'Social refresh is rate limited. Please try again later. Existing data is unchanged.':'Social refresh failed. Existing data is unchanged.'},{status:limited?429:503,headers});
 }
}
