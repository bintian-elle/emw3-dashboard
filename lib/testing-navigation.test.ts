import test from "node:test";
import assert from "node:assert/strict";
import {safeTestingReturnTo,withTestingReturnTo,isConcludedTestingNavigation,testingCampaignAnchor,testingCampaignHref,clearTestingPeriod,testingDocumentPeriodRedirect} from "./testing-navigation.ts";
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

test("refresh clears period dates while preserving preview, navigation and anchors",()=>{
 const origin="/bluevua/testing/google/search?period=custom&start=2026-09-01&end=2026-09-09&designPreview=nova#campaign";
 const parent=withTestingReturnTo("/bluevua/testing/google/concluded/test/treatment?period=last30",origin);
 const href=withTestingReturnTo("/bluevua/testing/google/search/123?period=last7&designPreview=nova",parent)+"#creative";
 const url=new URL(clearTestingPeriod(href),"https://test");
 assert.equal(url.searchParams.get("period"),null);
 assert.equal(url.searchParams.get("designPreview"),"nova");
 assert.equal(url.hash,"#creative");
 const next=new URL(url.searchParams.get("returnTo")!,"https://test");
 assert.equal(next.searchParams.has("period"),false);
 const nested=new URL(next.searchParams.get("returnTo")!,"https://test");
 assert.equal(nested.searchParams.has("period"),false);
 assert.equal(nested.searchParams.has("start"),false);
 assert.equal(nested.searchParams.has("end"),false);
 assert.equal(nested.searchParams.get("designPreview"),"nova");
 assert.equal(nested.hash,"#campaign");
});

test("refresh leaves unrelated URLs and query parameters intact",()=>{
 const href="/bluevua/testing?designPreview=nova&returnTo=https%3A%2F%2Fexample.com%2F%3Fperiod%3Dlast7#section";
 assert.equal(clearTestingPeriod(href),href);
 assert.equal(clearTestingPeriod("https://example.com/?period=last7"),"https://example.com/?period=last7");
});
test('document refresh resets period before fetching, while shared links and client navigations retain it',()=>{
 const url='/bluevua/testing?designPreview=nova&period=custom&start=2026-10-01&end=2026-10-07';
 const document=new Headers({'sec-fetch-mode':'navigate','sec-fetch-dest':'document'});
 const spa=new Headers({'accept':'text/x-component','rsc':'1'});
 assert.equal(testingDocumentPeriodRedirect(url,'GET',document),'/bluevua/testing?designPreview=nova');
 assert.equal(testingDocumentPeriodRedirect(`${url}&shared=1`,'GET',document),null);
 assert.equal(testingDocumentPeriodRedirect(url,'GET',spa),null);
 assert.equal(testingDocumentPeriodRedirect(url,'GET',new Headers({'accept':'text/html'})),'/bluevua/testing?designPreview=nova');
 assert.equal(testingDocumentPeriodRedirect(`${url}&_rsc=abc`,'GET',new Headers({'accept':'text/html'})),null);
 assert.equal(testingDocumentPeriodRedirect(url,'GET',new Headers({'sec-fetch-mode':'cors','sec-fetch-dest':'empty','accept':'text/html'})),null);
 assert.equal(testingDocumentPeriodRedirect(url,'GET',new Headers({'accept':'*/*'})),null);
 assert.equal(testingDocumentPeriodRedirect(url,'POST',document),null);
 assert.equal(testingDocumentPeriodRedirect('/other?period=last7','GET',document),null);
 const nested='/bluevua/testing/google/search/group?designPreview=nova&returnTo=%2Fbluevua%2Ftesting%3Fperiod%3Dlast7%26designPreview%3Dnova';
 assert.equal(testingDocumentPeriodRedirect(nested,'GET',document),'/bluevua/testing/google/search/group?designPreview=nova&returnTo=%2Fbluevua%2Ftesting%3FdesignPreview%3Dnova');
});
