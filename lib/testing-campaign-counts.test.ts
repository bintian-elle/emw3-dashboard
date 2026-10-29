import assert from 'node:assert/strict';
import test from 'node:test';
import {configuredTestingCampaignCount,testingCampaignCounts} from './testing-campaign-counts.ts';
import {buildTestingInventory} from './testing-inventory-model.ts';

test('the manually configured total is derived from the channel counts and not from inventory snapshots',()=>{
 const total=Object.values(testingCampaignCounts).reduce((sum,count)=>sum+count,0);
 assert.equal(configuredTestingCampaignCount(),total);
 for(const channel of Object.keys(testingCampaignCounts) as Array<keyof typeof testingCampaignCounts>){
  assert.equal(configuredTestingCampaignCount(channel),testingCampaignCounts[channel]);
 }
 const unrelated=buildTestingInventory({'google-search':null,'google-pmax':[], 'google-demand-gen':[],meta:[],reddit:[],edm:[]});
 assert.ok(unrelated.unavailable.includes('google-search'));
 assert.equal(configuredTestingCampaignCount(),total);
});
