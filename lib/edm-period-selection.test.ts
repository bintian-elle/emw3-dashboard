import {test} from "node:test";
import assert from "node:assert/strict";
import {edmPresets,edmRangeFor,edmCompareRange,matchEdmPeriod,matchEdmComparison,swapEdmPeriods} from "./edm-period-selection.ts";
const today="2026-10-13";
test("swap recognizes Last Week on the comparison side and swaps back to Previous period",()=>{
 const range=edmRangeFor("Last Week (Tue–Mon)",today),comparisonRange=edmCompareRange(range,"Previous period");
 const swapped=swapEdmPeriods(range,comparisonRange,today,"Last Week (Tue–Mon)","Previous period");
 assert.equal(swapped.preset,"Custom");assert.equal(swapped.comparison,"Last Week (Tue–Mon)");
 const restored=swapEdmPeriods(swapped.range,swapped.comparisonRange,today,swapped.preset,swapped.comparison);
 assert.equal(restored.preset,"Last Week (Tue–Mon)");assert.equal(restored.comparison,"Previous period");assert.deepEqual(restored.range,range);assert.deepEqual(restored.comparisonRange,comparisonRange);
});
test("every absolute preset matches on both sides",()=>{for(const label of edmPresets.filter(label=>label!=="Custom")){const range=edmRangeFor(label,today);assert.equal(matchEdmPeriod(range,today,label),label);assert.equal(matchEdmComparison(range,{start:"2026-02-01",end:"2026-02-05"},today,label),label);}});
test("unmatched ranges remain custom and matching requires both dates",()=>{const range={start:"2024-02-10",end:"2024-02-11"};assert.equal(matchEdmPeriod(range,today),"Custom");assert.equal(matchEdmComparison(range,edmRangeFor("Last 30 days",today),today),"Custom");const preset=edmRangeFor("Last Week (Tue–Mon)",today);assert.equal(matchEdmPeriod({...preset,start:"2026-10-01"},today),"Custom");});
test("relative comparisons are evaluated against the current reporting range",()=>{const range={start:"2026-04-03",end:"2026-04-18"};for(const kind of ["Previous year","Previous period"]){assert.equal(matchEdmComparison(edmCompareRange(range,kind),range,today),kind);}});
