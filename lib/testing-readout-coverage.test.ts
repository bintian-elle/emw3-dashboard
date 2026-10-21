import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeTestingReadouts} from './testing-readout-contract.ts';
const period={label:'Last Week (Tue–Mon)',start:'2026-10-13',end:'2026-10-19'};
const key='period:last-week-tue-mon:2026-10-13:2026-10-19';
const batch=(evidence:string[],actions:string[])=>({schema_version:'1.0',run_mode:'period_readout_batch',period_readouts:[{schema_version:'1.0',run_mode:'period_readout',period,overview:{executive_summary:'Summary',key_findings:['Finding'],recommended_actions:actions,data_gaps:[]},tests:[{test_id:'test',channel:'Meta',summary:'Performance summary',recommended_action:'Test the first frame using matched audiences.',asset_insights:evidence,data_gaps:[],evidence:[]}]}]});
test('a document requirement may not disappear from a successful generated result',()=>{
 const decoded=decodeTestingReadouts(batch(['[MT-CREATIVES] Named ad finding.'],['Next step']),[period],{[key]:['test']},{Meta:['MT-CREATIVES','MT-ACTIONS']});
 assert.equal(decoded.records.size,0);assert.ok(decoded.errors.some(e=>e.includes('MT-ACTIONS')));
});
test('explicit data gaps cover unavailable requirements without invented findings',()=>{
 const data=batch(['[MT-CREATIVES] Named ad finding.','[MT-ACTIONS] Test the first frame.'],['Next step']);
 assert.equal(decodeTestingReadouts(data,[period],{[key]:['test']},{Meta:['MT-CREATIVES','MT-ACTIONS']}).records.size,1);
});
test('overview optimization recommendations are required',()=>{
 const decoded=decodeTestingReadouts(batch(['[MT-CREATIVES] Finding.'],[]),[period],{[key]:['test']},{Meta:['MT-CREATIVES']});assert.equal(decoded.records.size,0);
});

test('unknown channels cannot bypass the document coverage checklist',()=>{
 const data=batch(['[MT-CREATIVES] Named finding.'],['Next step']);data.period_readouts[0].tests[0].channel='Unknown';
 assert.equal(decodeTestingReadouts(data,[period],{[key]:['test']},{Meta:['MT-CREATIVES']}).records.size,0);
});
