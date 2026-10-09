import test from "node:test";
import assert from "node:assert/strict";
import {previewDestination,previewTextCombination} from "./search-ad-preview.ts";
test("preview keeps pinned copy in its assigned positions",()=>{
 const assets=[{text:"Pinned first",pinnedField:"HEADLINE_1"},{text:"Pinned third",pinnedField:"HEADLINE_3"},{text:"Free A"},{text:"Free B"}];
 assert.deepEqual(previewTextCombination(assets,"HEADLINE",3,0),["Pinned first","Free A","Pinned third"]);
 assert.deepEqual(previewTextCombination(assets,"HEADLINE",3,1),["Pinned first","Free B","Pinned third"]);
});
test("uses available copy without duplicating or inventing headlines",()=>assert.deepEqual(previewTextCombination([{text:"Only headline"}],"HEADLINE",3,2),["Only headline"]));
test("display URL uses supplied RSA paths while link retains real destination",()=>{
 const result=previewDestination("https://bluevua.com/products/ro?utm_source=google","summer","sale_2026");assert.equal(result.display,"bluevua.com/summer/sale_2026");assert.ok(result.href?.includes("utm_source=google"));assert.equal(previewDestination("javascript:alert(1)").href,null);
});
