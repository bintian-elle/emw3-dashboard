import test from "node:test";
import assert from "node:assert/strict";
import {safeTestingReturnTo,withTestingReturnTo,isConcludedTestingNavigation,testingCampaignAnchor,testingCampaignHref} from "./testing-navigation.ts";
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

test("campaign return preserves origin, updates dates and targets the matching card",()=>{
 const name="EM | Autumn brew / A&B %";
 const result=testingCampaignHref("/bluevua/testing?period=custom&start=2026-01-01&end=2026-01-05", "edm", name,{period:"lastWeek"});
 const url=new URL(result,"https://test");
 assert.equal(url.pathname,"/bluevua/testing");
 assert.equal(url.searchParams.get("period"),"lastWeek");
 assert.equal(url.searchParams.has("start"),false);
 assert.equal(url.searchParams.has("end"),false);
 assert.equal(decodeURIComponent(url.hash.slice(1)),testingCampaignAnchor("edm",name));
});
test("campaign return rejects external origins and accepts custom dates",()=>{
 const url=new URL(testingCampaignHref("https://outside.example", "meta", "Campaign", {period:"custom",start:"2026-09-01",end:"2026-09-07"}),"https://test");
 assert.equal(url.pathname,"/bluevua/testing");
 assert.equal(url.searchParams.get("start"),"2026-09-01");
 assert.equal(url.searchParams.get("end"),"2026-09-07");
});
