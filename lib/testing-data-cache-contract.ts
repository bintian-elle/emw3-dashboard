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
