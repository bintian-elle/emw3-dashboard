import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reusableManualTests} from './testing-manual-reuse.ts';
import {testingReadoutKey} from './testing-readout-contract.ts';
import {manualPromptFiles,manualTestingScope} from './testing-manual-scope.ts';

const period={label:'Last 7 days',start:'2026-10-26',end:'2026-11-01'};
const selected=[{test_id:'meta-a',channel:'Meta'},{test_id:'search-a',channel:'Google Search'}];
const saved={test_id:'meta-a',channel:'Meta',summary:'Saved',recommended_action:'Continue'};
const record={cache_key:testingReadoutKey({...period,manualScope:'meta'})!,payload:{period:{...period,manualScope:'meta'},tests:[saved]}};
test('manual generation uses only the selected channel prompt',()=>{
 assert.deepEqual(manualPromptFiles('meta'),['meta']);
 assert.equal(manualTestingScope('reddit-awareness'),'reddit');
 assert.ok(manualPromptFiles('overview').includes('overview'));
 assert.ok(!manualPromptFiles('meta').includes('master'));
});
test('overview reuses matching channel results only for the exact period and test',()=>{
 assert.deepEqual(reusableManualTests(period,selected,[record]),[saved]);
 assert.deepEqual(reusableManualTests({...period,end:'2026-10-31'},selected,[record]),[]);
 assert.deepEqual(reusableManualTests(period,[{test_id:'different',channel:'Meta'}],[record]),[]);
 assert.deepEqual(reusableManualTests(period,selected,[{...record,payload:{...record.payload,tests:[{...saved,recommended_action:null}]}}]),[]);
});

test('overview can reuse a normal scheduled report for the same period',()=>{
 const scheduled={cache_key:testingReadoutKey(period)!,payload:{period,tests:[saved]}};
 assert.deepEqual(reusableManualTests(period,selected,[scheduled]),[saved]);
});
test('the same dates can reuse a report saved under another preset',()=>{
 const other={...period,label:'Custom',manualScope:'meta'};
 const sameDates={cache_key:testingReadoutKey(other)!,payload:{period:other,tests:[saved]}};
 assert.deepEqual(reusableManualTests(period,selected,[sameDates]),[saved]);
});
