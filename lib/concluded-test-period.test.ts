import test from "node:test";
import assert from "node:assert/strict";
import {concludedReportForPeriod} from "./concluded-test-period.ts";
import type {GoogleSearchTest} from "./testing-google.ts";
const report:GoogleSearchTest={campaignName:"Brand",campaignStatus:"Concluded",periodLabel:"Test lifetime",period:{start:"2026-07-31",end:"2026-09-23"},groups:[]};
const daily=[{label:"Group A" as const,name:"Test",adGroupId:"a",days:[{date:"2026-08-01",spend:10,revenue:50,orders:2,impressions:100,clicks:10},{date:"2026-09-01",spend:20,revenue:40,orders:1,impressions:200,clicks:10}]}];
test("excluded when the selection is after conclusion",()=>assert.equal(concludedReportForPeriod(report,daily,{start:"2026-09-29",end:"2026-10-05"},"Last Week"),null));
test("partial overlap uses only selected days and recalculates ratios",()=>{
 const selected=concludedReportForPeriod(report,daily,{start:"2026-09-01",end:"2026-09-30"},"Custom")!;
 assert.equal(selected.groups[0].spend,20);assert.equal(selected.groups[0].roas,2);assert.equal(selected.groups[0].cvr,.1);assert.equal(selected.period!.end,"2026-09-30");assert.equal(selected.campaignStatus,"Concluded");
});
test("full range combines raw metrics rather than averaging rates",()=>{
 const selected=concludedReportForPeriod(report,daily,{start:"2026-07-01",end:"2026-10-01"},"Custom")!;
 assert.equal(selected.groups[0].roas,3);assert.equal(selected.groups[0].ctr,20/300);
});
