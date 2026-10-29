import {isConcludedTestingNavigation} from './testing-navigation.ts';
import type {TestingDataChannel,TestingDataInput} from './testing-data-cache-contract.ts';

export type TestingSnapshotView='overview'|'inventory'|TestingDataChannel;
export const testingSnapshotViews:readonly TestingSnapshotView[]=['overview','inventory','google-search','google-pmax','google-demand-gen','meta','reddit','edm','social'];
const inventoryChannels:readonly TestingDataChannel[]=['google-search','google-pmax','google-demand-gen','meta','reddit','edm'];

/** Only watch the live data used by this Testing page; concluded snapshots are fixed. */
export function testingSnapshotView(pathname:string,returnTo?:string|null):TestingSnapshotView|null{
 const root='/bluevua/testing';
 if(pathname!==root&&!pathname.startsWith(`${root}/`))return null;
 if(isConcludedTestingNavigation(pathname,returnTo))return null;
 if(pathname===`${root}/inventory`)return 'inventory';
 if(pathname.startsWith(`${root}/google/pmax`))return 'google-pmax';
 if(pathname.startsWith(`${root}/google/demand-gen`))return 'google-demand-gen';
 if(pathname.startsWith(`${root}/google`))return 'google-search';
 for(const channel of ['meta','reddit','edm','social'] as const)if(pathname===`${root}/${channel}`||pathname.startsWith(`${root}/${channel}/`))return channel;
 return pathname===root||pathname===`${root}/`?'overview':null;
}

export function testingSnapshotChannels(view:TestingSnapshotView):readonly TestingDataChannel[]{
 if(view==='overview')return [...inventoryChannels,'social'];
 if(view==='inventory')return inventoryChannels;
 return [view];
}

export function testingSnapshotScopes(view:TestingSnapshotView,input:TestingDataInput={}){
 return testingSnapshotChannels(view).map(channel=>({channel,input,...(view==='inventory'&&!channel.startsWith('google-')?{latest:true}:{})}));
}

/** Inventory is a latest-snapshot view; its data is independent of the date filter. */
export function testingSnapshotWatchKey(view:TestingSnapshotView,period?:string|null,start?:string|null,end?:string|null){
 const query=new URLSearchParams({view});
 if(view!=='inventory')for(const [key,value] of Object.entries({period,start,end}))if(value)query.set(key,value);
 return query.toString();
}

/** Match the date-filter parsing used by the refresh-status endpoint. */
export function testingSnapshotInput(channel:TestingDataChannel,period?:string|null,start?:string|null,end?:string|null):TestingDataInput{
 const allowed=['lastWeek','wtd','mtd','ytd','last7','last30','last90','custom',...(channel==='reddit'?['sinceSep24']:[])];
 return {preset:period&&allowed.includes(period)?period:channel==='reddit'?'sinceSep24':'lastWeek',start:start??undefined,end:end??undefined};
}

/** Successful metadata is authoritative, including confirmed deletions and rollbacks. */
export function advanceSnapshotVersions(previous:readonly (string|null)[],next:readonly (string|null)[]):{versions:(string|null)[];changed:boolean}{
 if(previous.length!==next.length)return {versions:[...previous],changed:false};
 let changed=false;
 const versions=previous.map((value,index)=>{
  const candidate=next[index];
  if(candidate!==null&&!Number.isFinite(Date.parse(candidate)))return value;
  if(candidate!==value){changed=true;return candidate;}
  return value;
 });
 return {versions,changed};
}

/** A stale server instance must not cause a tight refresh loop. */
export function shouldAttemptSnapshotRefresh(target:string,previousTarget:string|null,elapsedMs:number){
 return target!==previousTarget||elapsedMs>=10_000;
}
