import type {TestingInventoryChannel} from './testing-inventory-model';

/** Manually maintained campaign counts. Update these values when the inventory changes. */
export const testingCampaignCounts:Readonly<Record<TestingInventoryChannel,number>>={
 'google-search':3,
 'google-pmax':3,
 'google-demand-gen':1,
 meta:1,
 reddit:2,
 edm:1,
};

/** Social Media is intentionally excluded from Test inventory. */
export function configuredTestingCampaignCount(channel?:TestingInventoryChannel):number{
 return channel?testingCampaignCounts[channel]:Object.values(testingCampaignCounts).reduce((sum,count)=>sum+count,0);
}
