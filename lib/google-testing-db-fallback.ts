import type {QueryResultRow} from "pg";
declare global {var emw3GoogleTestingDbRetryAt:number|undefined;}
export function isTransientDatabaseError(error:unknown):boolean{
 if(!(error instanceof Error))return false;
 const code=(error as Error&{code?:string}).code;
 return !!code&&["ECONNRESET","ECONNREFUSED","ETIMEDOUT","EHOSTUNREACH","ENETUNREACH","EPIPE","53300","57P01","57P02","57P03","57014"].includes(code)||/connection.*(?:timeout|terminated|closed)|timeout.*connection|query read timeout|timeout exceeded when trying to connect/i.test(error.message);
}
/** Connection failures must use the existing API snapshot, never zero-fill results. */
export async function readGoogleTestingDatabase<T extends QueryResultRow>(query:()=>Promise<{rows:T[]}>):Promise<{rows:T[]}|null>{
 if(Date.now()<(globalThis.emw3GoogleTestingDbRetryAt??0))return null;
 try{return await query();}catch(error){
  if(!isTransientDatabaseError(error))throw error;
  globalThis.emw3GoogleTestingDbRetryAt=Date.now()+60000;
  console.warn("Google Testing database connection unavailable; using cached Google Ads reporting.");
  return null;
 }
}
