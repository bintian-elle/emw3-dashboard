import 'server-only';
import {cache} from 'react';
import {readGoogleSearchSharedSnapshot} from './google-testing-api';
import {readGoogleExpandedSharedSnapshot} from './google-expanded-content-testing';
import {readLatestTestingDataSnapshot} from './testing-data-cache';
import {buildTestingInventory,type InventorySources,type TestingInventory} from './testing-inventory-model';
import type {MetaTestingSnapshot} from './testing-meta';
import type {RedditTestingData} from './testing-reddit';
import type {EdmTestingSnapshot} from './edm-live-refresh';
export type {TestingInventoryChannel,TestingInventoryItem,TestingInventory} from './testing-inventory-model';

/** Read published snapshots only: a sidebar or inventory view must never trigger a channel refresh. */
export const getTestingInventory=cache(async ():Promise<TestingInventory>=>{
 const [search,pmax,demand,meta,reddit,edm]=await Promise.all([
  readGoogleSearchSharedSnapshot().catch(()=>null),readGoogleExpandedSharedSnapshot('pmax').catch(()=>null),readGoogleExpandedSharedSnapshot('demand-gen').catch(()=>null),
  readLatestTestingDataSnapshot<MetaTestingSnapshot>('meta'),readLatestTestingDataSnapshot<{data:RedditTestingData}>('reddit'),readLatestTestingDataSnapshot<EdmTestingSnapshot>('edm'),
 ]);
 const sources:InventorySources={
  'google-search':search?search.inventory.ads.map(ad=>ad.campaign):null,
  'google-pmax':pmax?pmax.inventory.map(row=>row.campaign):null,
  'google-demand-gen':demand?demand.inventory.map(row=>row.campaign):null,
  meta:meta?.payload?.data&&Array.isArray(meta.payload.data.campaigns)?meta.payload.data.campaigns.map(c=>({id:c.campaignId,name:c.campaignName,status:c.effectiveStatus||c.campaignStatus})):null,
  reddit:reddit?.payload?.data&&Array.isArray(reddit.payload.data.campaigns)?reddit.payload.data.campaigns.map(c=>({id:c.campaignId,name:c.name,status:c.campaignStatus})):null,
  edm:edm?.payload?.data&&Array.isArray(edm.payload.data.campaigns)?edm.payload.data.campaigns.map(c=>({id:c.campaignId,name:c.campaignName,status:c.campaignStatus})):null,
 };
 return buildTestingInventory(sources);
});
