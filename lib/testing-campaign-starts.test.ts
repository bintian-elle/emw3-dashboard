import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {testingCampaignStart} from './testing-campaign-starts.ts';

test('selects the independently established date for each campaign',()=>{
 assert.equal(testingCampaignStart('meta','2026Nov9_EMW3_ContentTesing_Wave2_Prospecting_SalesConversion_VO'),'2026-11-09');
 assert.equal(testingCampaignStart('google-pmax','EM-PMAX-AllProduct-Mar25'),'2026-10-20');
 assert.equal(testingCampaignStart('google-search','EM-Search-Nonbrand-Competitor-IS-Jun25'),'2026-10-09');
});
test('does not substitute a channel date for an unverified campaign',()=>{
 assert.equal(testingCampaignStart('meta','New campaign'),null);
 assert.equal(testingCampaignStart('reddit','EM-PMAX-AllProduct-Mar25'),null);
});
