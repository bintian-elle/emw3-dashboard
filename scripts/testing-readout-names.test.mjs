import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nameTestingAds} from './testing-readout-names.mjs';
test('display real ad names without altering metrics, URLs or identifiers; idempotent',()=>{
 const periods=[{tests:[{channel:'Meta',ad_performance:[{adId:'120251709970970383',name:'2026_Video4_Actual_Name'}]}]}];
 const input={test_id:'Video4',summary:'Ad 120251709970970383 had 2 orders. Video4 merits testing. https://example.com/120251709970970383',value:2};
 const output=nameTestingAds(input,periods);
 assert.equal(output.test_id,'Video4');assert.equal(output.value,2);assert.match(output.summary,/Video4 — 2026_Video4_Actual_Name had 2 orders/);assert.match(output.summary,/https:\/\/example.com\/120251709970970383/);
 assert.deepEqual(nameTestingAds(output,periods),output);
});
