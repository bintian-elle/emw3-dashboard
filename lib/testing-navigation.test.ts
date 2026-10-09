import test from "node:test";
import assert from "node:assert/strict";
import {safeTestingReturnTo,withTestingReturnTo,isConcludedTestingNavigation} from "./testing-navigation.ts";
const arm="/bluevua/testing/google/concluded/test/treatment";
test("archive origin survives both drill-down levels",()=>{
 const armLink=withTestingReturnTo(arm,"/bluevua/testing/concluded/google");
 assert.ok(isConcludedTestingNavigation(arm,new URL(armLink,"https://test").searchParams.get("returnTo")));
 assert.ok(isConcludedTestingNavigation("/bluevua/testing/google/search/123",armLink));
});
test("performance origin retains reporting dates and performance sidebar",()=>{
 const parent="/bluevua/testing/google?period=custom&start=2026-09-01&end=2026-09-23";
 const armLink=withTestingReturnTo(arm,parent);
 assert.equal(safeTestingReturnTo(new URL(armLink,"https://test").searchParams.get("returnTo"),"fallback"),parent);
 assert.equal(isConcludedTestingNavigation("/bluevua/testing/google/search/123",armLink),false);
});
test("return paths stay inside testing and default for direct navigation",()=>{
 for(const invalid of ["https://example.com","//example.com","/api/private","/bluevua/testing/\\evil"]){assert.equal(safeTestingReturnTo(invalid,"fallback"),"fallback");}
 assert.equal(isConcludedTestingNavigation(arm),true);assert.equal(isConcludedTestingNavigation("/bluevua/testing/google/search/123"),false);
});

test("overview origin preserves its selected reporting period",()=>{
 const overview="/bluevua/testing?period=custom&start=2026-09-01&end=2026-09-10";
 assert.equal(safeTestingReturnTo(overview,"fallback"),overview);
 const arm=withTestingReturnTo("/bluevua/testing/google/concluded/test/treatment",overview);
 assert.equal(isConcludedTestingNavigation("/bluevua/testing/google/concluded/test/treatment",overview),false);
 assert.ok(arm.includes(encodeURIComponent(overview)));
});
