import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectCampaignEvidence} from './testing-campaign-evidence.ts';
test('only retains the matching campaign and removes channel totals',()=>{
 const data={period:{start:'2026-11-09',end:'2026-11-10'},totals:{spend:999},adGroups:[{spend:999}],campaigns:[{campaignName:'A',spend:5},{campaignName:'B',spend:400}]};
 assert.deepEqual(selectCampaignEvidence(data,'A'),{period:data.period,campaigns:[{campaignName:'A',spend:5}]});
});
test('missing or ambiguous campaign identity is not treated as a zero value',()=>{
 assert.throws(()=>selectCampaignEvidence({period:{start:'2026-11-09',end:'2026-11-10'},campaigns:[{name:'A'},{name:'A'}]},'A'));
 assert.throws(()=>selectCampaignEvidence({period:{start:'2026-11-09',end:'2026-11-10'},campaigns:[]},'A'));
});
