import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readoutTotals,deliveryWindow,overviewReadoutReference} from './testing-readout-input.ts';
import {generatedFramework} from './testing-readout-contract.ts';
test('aggregate efficiency uses total numerators and denominators',()=>{
 const result=readoutTotals([{spend:1,revenue:10,orders:1,impressions:10,clicks:1},{spend:99,revenue:0,orders:0,impressions:990,clicks:9}]);
 assert.equal(result.roas,.1);assert.equal(result.ctr,.01);assert.equal(result.cvr,.1);
});
test('delivery windows use positive activity, not name dates or zero rows',()=>{
 const row={spend:0,revenue:0,orders:0,impressions:0,clicks:0};
 const window=deliveryWindow([{...row,date:'2026-09-01'},{...row,date:'2026-10-15',impressions:20},{...row,date:'2026-10-15',clicks:1},{...row,date:'2026-10-20',spend:5}],{start:'2026-10-13',end:'2026-10-19'});
 assert.equal(window.first_observed_delivery,'2026-10-15');assert.equal(window.active_days_in_period,1);assert.equal(window.effective_end,'2026-10-15');
});
test('framework is extracted only from explicit generated evidence',()=>{
 assert.throws(()=>generatedFramework([{test_id:'x',summary:'Summary',evidence:[]}]));
 const result=generatedFramework([{test_id:'x',summary:'Summary',evidence:['[FRAMEWORK] {"goal":"Evaluate message","hypothesis":"Message improves CTR","hypothesisBasis":"inferred"}']}]);
 assert.equal(result[0].test_goal,'Evaluate message');
});
test('overview reference preserves configured testing financial scope and campaign reach components',()=>{
 const row={spend:10,revenue:20,orders:1,impressions:100,clicks:5};
 const result=overviewReadoutReference({channels:{Meta:[row],Reddit:[{...row,spend:30,revenue:0}]},reachComponents:{Google:null,Meta:80,Reddit:200,EDM:10}});
 assert.equal(result.paid.spend,40);assert.equal(result.paid.roas,.5);assert.equal(result.totalReach,290);assert.deepEqual(result.missingReachComponents,['Google']);
});

test('overview headline includes EDM while paid ROAS excludes it',()=>{
 const row={spend:100,revenue:200,orders:2,impressions:1000,clicks:10};
 const result=overviewReadoutReference({channels:{Meta:[row],Reddit:[{...row,spend:50,revenue:100}]},reachComponents:{Meta:500,Reddit:300,EDM:100},edm:{revenue:60,orders:1,uniqueClicks:5,delivered:100}});
 assert.equal(result.display.spend,150);assert.equal(result.display.revenue,360);assert.equal(result.display.orders,5);assert.equal(result.display.roas,2);assert.equal(result.display.ctr,25/2100);assert.equal(result.totalReach,900);
});
