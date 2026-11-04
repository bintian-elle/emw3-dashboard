import {readFile} from 'node:fs/promises';
export type StagingReleaseState='synced'|'pending'|'unknown';
export async function readStagingReleaseStatus(file:string):Promise<{state:StagingReleaseState}>{
 try{
  const value=JSON.parse(await readFile(file,'utf8'));
  if(!/^[a-f0-9]{40}$/.test(value.productionRevision)||!/^[a-f0-9]{40}$/.test(value.previewRevision))return {state:'unknown'};
  return {state:value.productionRevision===value.previewRevision?'synced':'pending'};
 }catch{return {state:'unknown'};}
}
