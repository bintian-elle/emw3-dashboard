import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerAiDatasets,type AiDatasetPolicy} from './testing-ai-datasets.ts';

const policy:AiDatasetPolicy={periods:[{start:'2026-11-10',end:'2026-11-16'},{start:'2026-11-03',end:'2026-11-09'}],entities:[{channel:'meta',id:'Campaign A',start:'2026-11-09'}],scopes:['channel','Campaign A']};
const sample=()=>({id:'ai.meta.performance',scope:'channel',columns:[{key:'spend',unit:'USD'}],rows:[{category:'Current',values:[{key:'spend',value:20}],period:{start:'2026-11-10',end:'2026-11-16'},entities:['Campaign A'],source:{channel:'meta',reference:'https://graph.facebook.com/v24.0/insights',request:'Selected campaign insights',retrieved_at:'2026-11-18T12:00:00Z'}}]});
test('registers AI-provided data and preserves row-level provenance without changing input',()=>{
 const input={input:{id:'input',scopes:['channel'],xKey:'category',columns:{category:'category'},rows:[]}};
 const result=registerAiDatasets([sample()],policy,input);
 assert.deepEqual(result.datasets['ai.meta.performance'].rows,[{category:'Current',spend:20}]);
 assert.equal(result.provenance['ai.meta.performance'][0].source.channel,'meta');
 assert.deepEqual(Object.keys(input),['input']);
});
test('rejects unknown entities, dates before testing and periods outside the report',()=>{
 const unknown=sample();unknown.rows[0].entities=['Unknown'];assert.throws(()=>registerAiDatasets([unknown],policy,{}));
 const early=sample();early.rows[0].period={start:'2026-11-03',end:'2026-11-09'};assert.throws(()=>registerAiDatasets([early],policy,{}));
 const outside=sample();outside.rows[0].period={start:'2026-10-01',end:'2026-10-03'};assert.throws(()=>registerAiDatasets([outside],policy,{}));
});
test('rejects fabricated scopes, malformed values, credential-bearing source URLs and collisions',()=>{
 const scope=sample();scope.scope='Other';assert.throws(()=>registerAiDatasets([scope],policy,{}));
 const bad=sample();bad.rows[0].values[0].value=NaN;assert.throws(()=>registerAiDatasets([bad],policy,{}));
 const secret=sample();secret.rows[0].source.reference='https://example.com/data?access_token=secret';assert.throws(()=>registerAiDatasets([secret],policy,{}));
 const item=sample();assert.throws(()=>registerAiDatasets([item],policy,{[item.id]:{id:item.id,scopes:['channel'],xKey:'category',columns:{category:'category'},rows:[]}}));
});

test('policy uses independently supplied campaign inventory and excludes unverified campaign names',async()=>{
 const {buildAiDatasetPolicy}=await import('./testing-ai-datasets.ts');
 const name='EM-PMAX-Bestseller-Oct25';const frozen={period:{start:'2026-11-10',end:'2026-11-16'},comparison:{start:'2026-11-03',end:'2026-11-09'},campaigns:[name,'Unknown'],tests:[{test_id:name},{test_id:'Unknown'}]};
 const result=buildAiDatasetPolicy(frozen,'google-pmax');assert.deepEqual(result.entities,[{channel:'google-pmax',id:name,start:'2026-10-19'}]);
 const overview=buildAiDatasetPolicy({...frozen,campaigns:[]},'overview',{'google-pmax':{frozen_input:frozen}});assert.deepEqual(overview.entities,result.entities);assert.deepEqual(overview.scopes,['channel']);
});
