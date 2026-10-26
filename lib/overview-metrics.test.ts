import {test} from "node:test";
import assert from "node:assert/strict";
import {aggregatePaidOverview,aggregateOverviewCtr} from "./overview-metrics.ts";
test("ROAS and CTR aggregate raw values instead of averaging rates",()=>{const result=aggregatePaidOverview([{spend:10,revenue:100,clicks:10,impressions:100},{spend:90,revenue:0,clicks:1,impressions:1000}]);assert.equal(result.roas,1);assert.equal(result.ctr,11/1100);});
test("zero denominators are unavailable",()=>{const result=aggregatePaidOverview([]);assert.equal(result.roas,null);assert.equal(result.ctr,null);});

test("overall CTR combines raw ad clicks and email unique clicks over their exposures",()=>{
 const result=aggregateOverviewCtr({clicks:100,impressions:1000},{uniqueClicks:20,delivered:4000});
 assert.equal(result.clicks,120);assert.equal(result.exposures,5000);assert.equal(result.ctr,.024);
 assert.notEqual(result.ctr,(.1+.005)/2);
});
test("overall CTR is unavailable without exposures",()=>assert.equal(aggregateOverviewCtr({clicks:0,impressions:0},{uniqueClicks:0,delivered:0}).ctr,null));

test('unknown PMax testing impressions do not become a false combined CTR',()=>{
 const paid=aggregatePaidOverview([{spend:20,revenue:40,clicks:4,impressions:null},{spend:10,revenue:20,clicks:2,impressions:100}]);
 assert.equal(paid.roas,2);assert.equal(paid.impressions,null);assert.equal(paid.ctr,null);assert.equal(aggregateOverviewCtr(paid,{uniqueClicks:3,delivered:100}).ctr,null);
});
