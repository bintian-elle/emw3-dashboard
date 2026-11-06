import {resolveTestingPeriod,testingLatestCompleteDate} from './testing-period.ts';
import {redditContentPeriod} from './reddit-content-testing.ts';
import type {TestingPeriodInput} from './testing-google.ts';

export type TestingDataChannel='google-search'|'google-pmax'|'google-demand-gen'|'meta'|'reddit'|'edm'|'social';
export type TestingDataInput={preset?:string;start?:string;end?:string};
export const testingDataChannels:readonly TestingDataChannel[]=['google-search','google-pmax','google-demand-gen','meta','reddit','edm','social'];
/** Raw Google/Instagram snapshots cover all periods; other reports represent one date range. */
export function testingDataSnapshotKey(channel:TestingDataChannel,input:TestingDataInput={},now=new Date()){
 if(channel.startsWith('google-')||channel==='social')return 'all';
 const latest=testingLatestCompleteDateFor(now),preset=input.preset??(channel==='reddit'?'sinceSep24':'lastWeek');
 const period=channel==='reddit'&&preset==='sinceSep24'?redditContentPeriod(now):resolveTestingPeriod(latest,{...input,preset} as TestingPeriodInput);
 return JSON.stringify({preset,start:period.start,end:period.end});
}
function testingLatestCompleteDateFor(now:Date){return new Date(now.getTime()-86400000).toISOString().slice(0,10);}
export {testingLatestCompleteDate};

/** Exact-date alternatives for staging when a custom range was saved under a preset. */
export function equivalentTestingDataScopes(scope:string):string[]{
 try{
  const parsed=JSON.parse(scope) as {preset?:string;start?:string;end?:string};
  if(parsed.preset==='custom'&&/^\d{4}-\d{2}-\d{2}$/.test(parsed.start??'')&&/^\d{4}-\d{2}-\d{2}$/.test(parsed.end??''))return [scope,...['lastWeek','wtd','mtd','last7','last30','last90','ytd'].map(preset=>JSON.stringify({preset,start:parsed.start,end:parsed.end}))];
 }catch{/* Non-date scopes have no alternatives. */}
 return [scope];
}
