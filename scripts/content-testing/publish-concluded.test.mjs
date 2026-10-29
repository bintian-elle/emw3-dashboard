import test from 'node:test';
import assert from 'node:assert/strict';
import {buildConcludedPayload} from './publish-concluded.mjs';
const period={label:'Lifetime snapshot',start:'2026-07-31',end:'2026-09-23',concludedTestId:'test-one'};
const manifest={run_id:'run-one',reports:[{report_id:'google-search'}]};
const packet={period,required_sections:['Analysis'],channel:'Google Search',tests:[{test_id:'test-one',campaign_name:'Brand',snapshot_finalized:true}]};
const report={schema_version:'channel-prompt-preview-v1',run_id:'run-one',report_id:'google-search',language:'en',scope:'lifetime',period,title:'Search',executive_summary:'Summary',sections:[{title:'Analysis',markdown:'Analysis'}],campaigns:[{test_id:'test-one',summary:'Summary',detail_markdown:'Detail'}],sources:[],data_gaps:[]};
test('finalized report uses the stable key and new channel sections',()=>{const result=buildConcludedPayload(manifest,packet,report);assert.equal(result.key,'period:concluded:test-one');assert.equal(result.payload.tests[0].campaign_name,'Brand');assert.equal(result.payload.tests[0].preview_sections[1].markdown,'Detail');});
test('rejects incomplete, provisional and mismatched results before publication',()=>{assert.throws(()=>buildConcludedPayload(manifest,{...packet,tests:[{...packet.tests[0],snapshot_finalized:false}]},report));assert.throws(()=>buildConcludedPayload(manifest,packet,{...report,campaigns:[]}));assert.throws(()=>buildConcludedPayload(manifest,packet,{...report,period:{...period,end:'2026-09-22'}}));});
