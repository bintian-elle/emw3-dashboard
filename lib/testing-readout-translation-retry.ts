import {decodeReadoutTranslation} from './testing-readout-translation-contract.ts';
type Job={status:string;result?:unknown};
/** Persisted attempt IDs deduplicate polling and resume only the failing chunk. */
export async function resolveTranslationChunk(id:string,source:string[],enqueue:boolean,read:(id:string)=>Promise<Job|null>,create:(id:string,reason:string)=>Promise<Job>):Promise<Map<string,string>|null>{
 let reason='';
 for(let attempt=0;attempt<3;attempt++){
  const attemptId=attempt?`${id}:retry:${attempt}`:id;
  const existing=await read(attemptId);
  if(!existing&&!enqueue)return null;
  const job=existing??await create(attemptId,reason);
  if(job.status==='failed'){reason='Translation task failed.';continue;}
  if(job.status!=='completed')return null;
  try{return decodeReadoutTranslation(job.result,source);}
  catch(error){reason=error instanceof Error?error.message:'Invalid translation.';}
 }
 if(!enqueue)return null;
 throw Error(`Translation chunk ${id} failed after 3 attempts: ${reason}`);
}
