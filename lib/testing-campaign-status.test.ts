import test from 'node:test';
import assert from 'node:assert/strict';
import {activeCampaignsFirst,testingCampaignStatus} from './testing-campaign-status.ts';

test('channel statuses use the same labels and colors as the inventory',()=>{
 for(const status of ['ACTIVE','ENABLED','SERVING'])assert.deepEqual(testingCampaignStatus(status,false),{tone:'active',label:'Active'});
 for(const status of ['PAUSED','CAMPAIGN_PAUSED'])assert.deepEqual(testingCampaignStatus(status,true),{tone:'paused',label:'已暂停'});
 for(const status of ['SENT','COMPLETED'])assert.deepEqual(testingCampaignStatus(status,false),{tone:'sent',label:'Sent'});
 assert.deepEqual(testingCampaignStatus('CONCLUDED',false),{tone:'ended',label:'Concluded'});
 assert.deepEqual(testingCampaignStatus('UNKNOWN',false),{tone:'unknown',label:'Unknown'});
});

test('Meta active campaigns come first without changing the order within each status',()=>{
 const rows=[{id:'a',status:'PAUSED'},{id:'b',status:'ACTIVE'},{id:'c',status:'ENABLED'},{id:'d',status:'PAUSED'}];
 assert.deepEqual(activeCampaignsFirst(rows,item=>item.status).map(item=>item.id),['b','c','a','d']);
 assert.equal(rows[0].id,'a');
});
