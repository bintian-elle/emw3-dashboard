import 'server-only';
import {readGoogleTestingApiData} from '@/lib/google-testing-api';
import {googleContentTestingInventory} from '@/lib/google-content-testing-scope';
import {getExpandedGoogleTestingReadoutHistory} from '@/lib/google-expanded-content-testing';
import {readConcludedSnapshot} from '@/lib/concluded-test-snapshot';
import {concludedTestsForChannel} from '@/lib/concluded-tests';
import {getMetaOverviewDaily,type MetaCampaignTest} from '@/lib/testing-meta';
import {getRedditOverviewDaily,type RedditTestingData} from '@/lib/testing-reddit';
import {edmOverviewDaily} from '@/lib/edm-event-performance';
import type {EdmTestingData} from '@/lib/testing-edm';
import type {GoogleSearchTest} from '@/lib/testing-google';
import {buildOverviewDailyMetrics,selectGoogleSearchTestingAds,type OverviewDailySource,type OverviewDailyRow,type OverviewTrends} from '@/lib/overview-daily-metrics';

async function googleDaily(google:GoogleSearchTest[],period:{start:string;end:string}):Promise<OverviewDailySource>{
 const [search,inventory,pmax,demand,snapshots]=await Promise.all([
  readGoogleTestingApiData(),googleContentTestingInventory(),getExpandedGoogleTestingReadoutHistory('pmax',period.start),getExpandedGoogleTestingReadoutHistory('demand-gen',period.start),
  Promise.all(concludedTestsForChannel('Google').filter(test=>test.testScope!=='placement').map(test=>readConcludedSnapshot(test.id))),
 ]);
 const rows:OverviewDailyRow[]=[];
 const groups=new Map(google.flatMap(test=>test.groups.map(group=>[`${test.campaignName}:${group.adGroupId}`,test.creativeType??'Message'] as const)));
 const searchInventoryIds=new Set(inventory.ads.map(row=>row.adGroupAd.ad.id));
 for(const row of selectGoogleSearchTestingAds(search.rows,searchInventoryIds)){const assetType=groups.get(`${row.campaign.name}:${row.adGroup.id}`);if(!assetType)continue;rows.push({date:row.segments.date,entityId:row.adGroupAd.ad.id,cvrEntityId:row.adGroup.id,assetType,spend:Number(row.metrics.costMicros??0)/1e6,revenue:Number(row.metrics.conversionsValue??0),orders:Number(row.metrics.conversions??0),clicks:Number(row.metrics.clicks??0),impressions:Number(row.metrics.impressions??0)});}
 const entities=new Map(google.flatMap(test=>test.groups.map(group=>[group.adGroupId,test.creativeType??'Message'] as const)));
 for(const history of [pmax,demand])for(const row of history.rows){const assetType=entities.get(row.entityId!);if(assetType)rows.push({...row,entityId:row.entityId!,assetType,excludeFromAdCtr:history===pmax});}
 for(const snapshot of snapshots){if(!snapshot)continue;for(const group of snapshot.dailyGroups??[]){if(!groups.has(`${snapshot.report.campaignName}:${group.adGroupId}`))continue;for(const row of group.days)if(snapshot.report.period&&row.date>=snapshot.report.period.start&&row.date<=snapshot.report.period.end)rows.push({...row,entityId:`concluded:${group.adGroupId}`,assetType:'Message',assetCountUnavailable:true});}}
 return {channel:'Google',rows:rows.filter(row=>row.date>=period.start&&row.date<=period.end)};
}

export async function getOverviewDailyData({google,meta,reddit,edm}:{google:GoogleSearchTest[];meta:MetaCampaignTest;reddit:RedditTestingData;edm:EdmTestingData}):Promise<OverviewTrends>{
 const channels=['Google','Meta','Reddit','EDM'];
 const results=await Promise.allSettled([googleDaily(google,meta.period),getMetaOverviewDaily(meta),getRedditOverviewDaily(reddit),edmOverviewDaily(edm)]);
 const sources:OverviewDailySource[]=[],issues:string[]=[];
 results.forEach((result,index)=>{if(result.status==='fulfilled')sources.push(result.value);else{console.warn(`${channels[index]} Overview daily trend unavailable:`,result.reason instanceof Error?result.reason.message:'Reporting failed');issues.push(`${channels[index]} daily data unavailable`);}});
 return {metrics:buildOverviewDailyMetrics(meta.period,sources),issues};
}
