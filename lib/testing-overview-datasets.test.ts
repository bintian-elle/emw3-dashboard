import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildOverviewDatasets} from './testing-overview-datasets.ts';

const current={start:'2026-11-10',end:'2026-11-16'},previous={start:'2026-11-03',end:'2026-11-09'};
const metric=(spend:number,revenue:number,orders:number)=>({spend,revenue,orders,clicks:10,impressions:100});
const testInput=(now:unknown,before:unknown,prior=previous)=>({testing_scope:{current,previous:prior},dashboard:[{period:current,snapshot:{campaigns:[now]}},{period:prior,snapshot:{campaigns:[before]}}]});
test('uses only selected test entities, recomputes ratios and preserves period boundaries',()=>{
 const jobs={
  'google-pmax':{frozen_input:{tests:[testInput({groups:[{rows:[{metrics:metric(10,30,2),assets:[{metrics:metric(900,900,9)}]}]}]},{groups:[{rows:[{metrics:metric(20,40,1)}]}]})]}},
  reddit:{frozen_input:{tests:[testInput({spend:1000,groups:[{activeAds:[metric(5,15,1)]}]},{spend:1000,groups:[{activeAds:[metric(8,8,1)]}]})]}},
 };
 const result=buildOverviewDatasets(jobs,{current,previous});
 assert.deepEqual(result.datasets['overview.google-pmax.periods'].rows.map(r=>[r.spend,r.revenue,r.roas]),[[20,40,2],[10,30,3]]);
 assert.deepEqual(result.datasets['overview.reddit.periods'].rows.map(r=>r.spend),[8,5]);
});
test('omits clipped or missing periods instead of inventing comparable data',()=>{
 const clipped={start:'2026-11-09',end:previous.end};
 const jobs={meta:{frozen_input:{tests:[testInput({totals:metric(5,10,1)},{totals:metric(1,2,1)},clipped)]}}};
 const result=buildOverviewDatasets(jobs,{current,previous});
 assert.equal(result.datasets['overview.meta.periods'].rows.length,1);
 assert.equal(result.datasets['overview.meta.periods'].rows[0].spend,5);
 assert.match(result.gaps.join(' '),/meta.*previous/i);
});
test('does not produce unavailable metrics or cross-channel totals as zeros',()=>{
 const jobs={'google-search':{frozen_input:{tests:[testInput({groups:[{...metric(10,0,0),impressions:null}]},{groups:[metric(5,0,0)]})]}}};
 const result=buildOverviewDatasets(jobs,{current,previous});
 assert.equal(result.datasets['overview.google-search.periods'].rows[1].impressions,null);
 assert.equal(result.datasets['overview.google-search.periods'].rows[1].roas,0);
 assert.equal(result.datasets['overview.paid.current'].rows[0].category,'Google Search');
 assert.equal(result.datasets['overview.paid.current'].rows[0].spend,undefined);
});
