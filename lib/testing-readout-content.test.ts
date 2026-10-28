import test from 'node:test';
import assert from 'node:assert/strict';
import {testingReadoutContent,withoutTestingFramework,testingReadoutCampaignCatalog,testingReadoutCatalogKeys} from './testing-readout-content.ts';

test('removes obsolete goals and hypotheses while preserving analytical findings and source input',()=>{
 const input={test_frameworks:[{test_goal:'Old goal'}],tests:[{test_id:'a',test_goal:'Old goal',hypothesis:{text:'Old hypothesis'},summary:'Revenue grew.',evidence:['[FRAMEWORK] {"goal":"Old"}','Ad 123 produced two orders.'],delta:{metrics:[]}}]};
 const before=structuredClone(input),result=withoutTestingFramework(input);
 assert.deepEqual(result,{tests:[{test_id:'a',summary:'Revenue grew.',evidence:['Ad 123 produced two orders.'],delta:{metrics:[]}}]});
 assert.deepEqual(input,before);
});
test('comparison catalog uses period test identities without generated frameworks and deduplicates periods',()=>{
 const payload={tests:[{test_id:'campaign-a',campaign_name:'Search campaign',channel:'Google Search'},{test_id:'social-selected-posts',campaign_name:'Selected Instagram posts',channel:'Social Media'},{test_id:'unknown',channel:'Unknown'}]};
 assert.deepEqual(testingReadoutCampaignCatalog([{payload},{payload}]),[{channel:'google-search',campaign:'Search campaign'},{channel:'social',campaign:'social-selected-posts'}]);
 assert.deepEqual(testingReadoutCampaignCatalog([{payload:{test_frameworks:[{test_id:'old',channel:'Meta'}]}}]),[]);
});

test('catalog requests only current analysis periods and lifetime records',()=>{
 const keys=testingReadoutCatalogKeys('2026-10-27');
 assert.ok(keys.includes('period:last-week-tue-mon:2026-10-20:2026-10-26'));
 assert.ok(keys.includes('period:social-lifetime'));
 assert.ok(keys.every(key=>key.startsWith('period:')));
});

test('concluded lifetime content retains framework through cache readers while active tests omit it',()=>{
 const payload={test_frameworks:[{test_id:'finished',test_goal:'Compare placement',hypothesis:{text:'Top placement improves reach'}}],tests:[{test_id:'finished',evidence:['[FRAMEWORK] {"goal":"Compare placement"}','Observed lift']}]};
 assert.deepEqual(testingReadoutContent('period:concluded:finished',payload),payload);
 assert.deepEqual(testingReadoutContent('period:week-to-date:2026-10-27:2026-10-28',payload),{tests:[{test_id:'finished',evidence:['Observed lift']}]});
});
