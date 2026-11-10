import type {TestingInventoryChannel} from './testing-inventory-model.ts';

/**
 * First verified Content Testing delivery, not the parent campaign creation date.
 * Audited 2026-11-10 against scoped Google/Meta/Reddit API history and Slack;
 * PMax excludes assets attached to currently non-testing groups and product ads.
 * Search's first delivery predates the Oct 9 rollout noted in Slack.
 * EDM uses the test email's actual send date.
 * Unknown or subsequently added campaigns intentionally have no inferred date.
 */
const campaignStarts:Partial<Record<TestingInventoryChannel,Readonly<Record<string,string>>>>={
 'google-search':{
  'EM-Search-Nonbrand-Purchase-Apr26':'2026-10-08',
  'EM-Search-Nonbrand-TIS-April26':'2026-10-08',
  'EM-Search-Nonbrand-Competitor-IS-Jun25':'2026-10-09',
 },
 'google-pmax':{
  'EM-PMAX-Conquesting-June26':'2026-10-19',
  'EM-PMAX-Bestseller-Oct25':'2026-10-19',
  'EM-PMAX-AllProduct-Mar25':'2026-10-20',
 },
 'google-demand-gen':{'EM-DG-Conversion-Prospecting-Purchase-April26':'2026-10-20'},
 meta:{
  '2026Oct12_EMW3_ContentTesing_Wave1_Prospecting_SalesConversion_HighestValue/Volume':'2026-10-12',
  '2026Nov9_EMW3_ContentTesing_Wave2_Prospecting_SalesConversion_VO':'2026-11-09',
 },
 reddit:{'EM-Reddit-Awareness-July26':'2026-09-24','EM-Reddit-Retargeting -July26':'2026-09-24','EM-Reddit-Conversion-July26':'2026-09-24'},
 edm:{'EM | The Secret to the Perfect Fall Brew | 0918 A/B Testing':'2026-09-18'},
};

export function testingCampaignStart(channel:TestingInventoryChannel,name:string):string|null{
 return campaignStarts[channel]?.[name]??null;
}
