import {redditContentPeriod} from './reddit-content-testing.ts';
import {resolveTestingPeriod} from './testing-period.ts';
import {testingSnapshotInput,type TestingSnapshotView} from './testing-snapshot-watch.ts';

/** The displayed range, not the URL preset, determines whether a day change matters. */
export function rollingTestingPeriod(view:TestingSnapshotView|null,preset:string|null|undefined,now:Date):string|null{
 if(!view||view==='inventory'||view==='social')return null;
 const channel=view==='overview'?'meta':view;
 const input=testingSnapshotInput(channel,preset);
 if(input.preset==='custom')return null;
 if(channel==='reddit'&&input.preset==='sinceSep24')return JSON.stringify(redditContentPeriod(now));
 const latest=new Date(now.getTime()-86_400_000).toISOString().slice(0,10);
 return JSON.stringify(resolveTestingPeriod(latest,input as Parameters<typeof resolveTestingPeriod>[1]));
}
