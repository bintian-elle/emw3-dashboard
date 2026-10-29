import assert from 'node:assert/strict';
import test from 'node:test';
import {countConcludedCampaigns} from './concluded-campaign-count.ts';

test('counts campaigns once per channel and maps legacy Google to Search', () => {
  const tests = [
    {channel:'Google',campaignName:'Alpha'},
    {channel:'Google Search',campaignName:'Alpha'},
    {channel:'Google Search',campaignName:'Beta'},
    {channel:'Meta',campaignName:'Alpha'},
    {channel:'Meta',campaignName:'Alpha'},
  ];
  assert.equal(countConcludedCampaigns(tests),3);
  assert.equal(countConcludedCampaigns(tests,'Google Search'),2);
  assert.equal(countConcludedCampaigns(tests,'Meta'),1);
  assert.equal(countConcludedCampaigns(tests,'Reddit'),0);
});
