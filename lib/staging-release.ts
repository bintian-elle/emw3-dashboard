import {readFile} from 'node:fs/promises';
export type StagingReleaseState='synced'|'pending'|'unknown';
export type StagingReleaseSummary={zh?:string;en?:string};
export type StagingReleaseStatus={state:StagingReleaseState;summary?:StagingReleaseSummary};
export async function readStagingReleaseStatus(file:string):Promise<StagingReleaseStatus>{
 try{
  const value=JSON.parse(await readFile(file,'utf8'));
  if(!/^[a-f0-9]{40}$/.test(value.productionRevision)||!/^[a-f0-9]{40}$/.test(value.previewRevision))return {state:'unknown'};
  const state=value.productionRevision===value.previewRevision?'synced':'pending';
  if(state!=='pending')return {state};
  const summary:StagingReleaseSummary={};
  for(const language of ['zh','en'] as const){const copy=value.summary?.[language];if(typeof copy==='string'&&copy.trim()&&copy.trim().length<=240)summary[language]=copy.trim();}
  return Object.keys(summary).length?{state,summary}:{state};
 }catch{return {state:'unknown'};}
}
