import 'server-only';
import {readGoogleSearchSharedSnapshot,apiGoogleAdArchive} from './google-testing-api';
import {getGoogleContentTests} from './testing-google';
import {aggregateGoogleAdPerformance} from './google-ad-performance';
import {comparisonRange} from './testing-comparison';
import type {validatePromptRun} from './testing-prompts-contract';
export async function promptTrialOptions(){const source=await readGoogleSearchSharedSnapshot();return {campaigns:[...new Set(source?.inventory.ads.map(ad=>ad.campaign.name)??[])],latest:source?.performance.end??null};}
export async function capturePromptTrial(input:ReturnType<typeof validatePromptRun>){
 const source=await readGoogleSearchSharedSnapshot();if(!source)throw Error('Published Search data is unavailable.');const period={start:input.start,end:input.end},comparison=comparisonRange(period,'previousPeriod',source.performance.end);
 if(period.end>source.performance.end||comparison.start<source.performance.start)throw Error('Choose dates covered by the published Dashboard history.');
 const names=[...new Set(source.inventory.ads.map(ad=>ad.campaign.name))];if(input.campaign!=='all'&&!names.includes(input.campaign))throw Error('Campaign is outside the configured testing scope.');
 const campaigns=input.campaign==='all'?names:[input.campaign],ads=source.inventory.ads.filter(ad=>campaigns.includes(ad.campaign.name)),allowed=new Set(ads.map(ad=>ad.adGroupAd.ad.id)),archive=apiGoogleAdArchive(source.performance);
 const [current,previous]=await Promise.all([getGoogleContentTests({preset:'custom',...period}),getGoogleContentTests({preset:'custom',...comparison})]);
 const groups=[...new Set(ads.map(ad=>ad.adGroup.id))];
 return {channel:'Google Search',period,comparison,source_captured_at:new Date(source.performance.capturedAt).toISOString(),campaigns,testing_label:source.inventory.label,current:current.filter(report=>campaigns.includes(report.campaignName)),previous:previous.filter(report=>campaigns.includes(report.campaignName)),ads,ad_metrics:groups.flatMap(group=>Object.entries(aggregateGoogleAdPerformance(archive,group,period,allowed)).map(([id,metrics])=>({id,group,...metrics}))),previous_ad_metrics:groups.flatMap(group=>Object.entries(aggregateGoogleAdPerformance(archive,group,comparison,allowed)).map(([id,metrics])=>({id,group,...metrics}))),daily:archive.days.filter(day=>allowed.has(day.adId)&&day.date>=comparison.start&&day.date<=period.end)};
}
