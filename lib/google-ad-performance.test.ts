import test from "node:test";
import assert from "node:assert/strict";
import {aggregateGoogleAdPerformance,type GoogleAdPerformanceArchive} from "./google-ad-performance.ts";
const archive={version:1,range:{start:"2026-09-01",end:"2026-09-30"},days:[{groupId:"g",adId:"a",date:"2026-09-01",spend:10,revenue:50,orders:2,impressions:100,clicks:10},{groupId:"g",adId:"a",date:"2026-09-02",spend:20,revenue:40,orders:1,impressions:200,clicks:10},{groupId:"other",adId:"a",date:"2026-09-01",spend:999,revenue:999,orders:999,impressions:999,clicks:999}]};
test("ad metrics sum selected dates and recompute ratios without mixing groups",()=>{
 const metrics=aggregateGoogleAdPerformance(archive,"g",{start:"2026-09-01",end:"2026-09-02"}).a;assert.equal(metrics.spend,30);assert.equal(metrics.revenue,90);assert.equal(metrics.roas,3);assert.equal(metrics.cpa,10);assert.equal(metrics.cvr,3/20);assert.equal(metrics.ctr,20/300);
});
test("partial periods exclude unselected daily performance",()=>assert.equal(aggregateGoogleAdPerformance(archive,"g",{start:"2026-09-02",end:"2026-09-02"}).a.spend,20));


test("content testing excludes ordinary ads from returned metrics even when they share an ad group",()=>{
 const archive:GoogleAdPerformanceArchive={version:1,range:{start:"2026-10-01",end:"2026-10-12"},days:[{groupId:"g",adId:"812461523434",date:"2026-10-08",spend:31.56,revenue:0,orders:0,impressions:220,clicks:10},{groupId:"g",adId:"827251948998",date:"2026-10-08",spend:4.89,revenue:0,orders:0,impressions:28,clicks:2}]};
 const result=aggregateGoogleAdPerformance(archive,"g",archive.range,new Set(["827248038948","827251948998"]));
 assert.deepEqual(Object.keys(result),["827251948998"]);assert.equal(result["827251948998"].spend,4.89);assert.equal(result["827251948998"].cpc,2.445);
});
