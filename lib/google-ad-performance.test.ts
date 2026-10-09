import test from "node:test";
import assert from "node:assert/strict";
import {aggregateGoogleAdPerformance} from "./google-ad-performance.ts";
const archive={version:1,range:{start:"2026-09-01",end:"2026-09-30"},days:[{groupId:"g",adId:"a",date:"2026-09-01",spend:10,revenue:50,orders:2,impressions:100,clicks:10},{groupId:"g",adId:"a",date:"2026-09-02",spend:20,revenue:40,orders:1,impressions:200,clicks:10},{groupId:"other",adId:"a",date:"2026-09-01",spend:999,revenue:999,orders:999,impressions:999,clicks:999}]};
test("ad metrics sum selected dates and recompute ratios without mixing groups",()=>{
 const metrics=aggregateGoogleAdPerformance(archive,"g",{start:"2026-09-01",end:"2026-09-02"}).a;assert.equal(metrics.spend,30);assert.equal(metrics.revenue,90);assert.equal(metrics.roas,3);assert.equal(metrics.cpa,10);assert.equal(metrics.cvr,3/20);assert.equal(metrics.ctr,20/300);
});
test("partial periods exclude unselected daily performance",()=>assert.equal(aggregateGoogleAdPerformance(archive,"g",{start:"2026-09-02",end:"2026-09-02"}).a.spend,20));
