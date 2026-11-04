import {reviewChanges,type StagingReviewChange} from './staging-review-changes.ts';
import {readFile} from 'node:fs/promises';
export type StagingReleaseState='synced'|'pending'|'unknown';
export type StagingReleaseSummary={zh?:string;en?:string};
export type StagingReleaseStatus={state:StagingReleaseState;summary?:StagingReleaseSummary;changes?:StagingReviewChange[]};
export async function readStagingReleaseStatus(file:string):Promise<StagingReleaseStatus>{
 try{
  const value=JSON.parse(await readFile(file,'utf8'));
  if(!/^[a-f0-9]{40}$/.test(value.productionRevision)||!/^[a-f0-9]{40}$/.test(value.previewRevision))return {state:'unknown'};
  const state=value.productionRevision===value.previewRevision?'synced':'pending';
  if(state!=='pending')return {state};
  const summary:StagingReleaseSummary={};
  for(const language of ['zh','en'] as const){const copy=value.summary?.[language];if(typeof copy==='string'&&copy.trim()&&copy.trim().length<=240)summary[language]=copy.trim();}
  const changes=reviewChanges(value.changeIds);
  return {state,...(Object.keys(summary).length?{summary}:{}),...(changes.length?{changes}:{})};
 }catch{return {state:'unknown'};}
}
