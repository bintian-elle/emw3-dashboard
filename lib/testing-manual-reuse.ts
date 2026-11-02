import {manualTestingChannels} from './testing-manual-scope.ts';
import {type CachedTestReadout,type ReadoutPeriod} from './testing-readout-contract.ts';

type SourceTest={test_id?:unknown;channel?:unknown};
type Cached={cache_key:string;payload:unknown};
/** Reuse only the exact requested dates, scope, test identity and a complete saved result. */
export function reusableManualTests(period:ReadoutPeriod,tests:SourceTest[],records:Cached[]){
 const reused:CachedTestReadout[]=[];
 for(const [scope,channel] of Object.entries(manualTestingChannels)){
  const expected=tests.filter(test=>test.channel===channel);
  if(!expected.length)continue;
  const candidates=records.filter(row=>row.cache_key.startsWith(`period:manual-${scope}-`)||(!row.cache_key.startsWith('period:manual-')&&!row.cache_key.startsWith('period:concluded:'))).sort((a,b)=>Number(b.cache_key.startsWith('period:manual-'))-Number(a.cache_key.startsWith('period:manual-')));
  for(const record of candidates){
   const payload=record.payload as {period?:ReadoutPeriod;tests?:CachedTestReadout[];metric_basis?:{pmax?:string}}|undefined;
   if(!payload||payload.period?.start!==period.start||payload.period?.end!==period.end||(record.cache_key.startsWith('period:manual-')&&payload.period?.manualScope!==scope))continue;
   if(scope==='google-pmax'&&payload.metric_basis?.pmax!=='pmax-testing-assets-v1')continue;
   const saved=expected.map(test=>payload.tests?.find(item=>item.test_id===test.test_id&&item.channel===channel));
   if(saved.some(test=>!test||!test.summary||!test.recommended_action))continue;
   reused.push(...saved as CachedTestReadout[]);break;
  }
 }
 return reused;
}
