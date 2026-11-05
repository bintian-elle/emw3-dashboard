import 'server-only';
import {readGoogleSearchSharedSnapshot,apiGoogleAdArchive} from './google-testing-api';
import {getGoogleContentTests} from './testing-google';
import {aggregateGoogleAdPerformance} from './google-ad-performance';
import {comparisonRange} from './testing-comparison';
import {getExpandedGoogleTesting,readGoogleExpandedSharedSnapshot} from './google-expanded-content-testing';
import {readComparisonPeriod} from './testing-comparison.server';
import {readTestingDataSnapshot} from './testing-data-cache';
import type {TestingDataChannel} from './testing-data-cache-contract';
import type {validatePromptRun} from './testing-prompts-contract';
export async function promptTrialOptions(){const source=await readGoogleSearchSharedSnapshot();return {campaigns:[...new Set(source?.inventory.ads.map(ad=>ad.campaign.name)??[])],latest:source?.performance.end??null};}
async function captureSearchTrial(input:ReturnType<typeof validatePromptRun>){
 const source=await readGoogleSearchSharedSnapshot();if(!source)throw Error('Published Search data is unavailable.');const period={start:input.start,end:input.end},comparison=input.comparison??comparisonRange(period,'previousPeriod',source.performance.end);
 if(period.end>source.performance.end||comparison.end>source.performance.end||period.start<source.performance.start||comparison.start<source.performance.start)throw Error('Choose dates covered by the published Dashboard history.');
 const names=[...new Set(source.inventory.ads.map(ad=>ad.campaign.name))];if(input.campaign!=='all'&&!names.includes(input.campaign))throw Error('Campaign is outside the configured testing scope.');
 const campaigns=input.campaign==='all'?names:[input.campaign],ads=source.inventory.ads.filter(ad=>campaigns.includes(ad.campaign.name)),allowed=new Set(ads.map(ad=>ad.adGroupAd.ad.id)),archive=apiGoogleAdArchive(source.performance);
 const [current,previous]=await Promise.all([getGoogleContentTests({preset:'custom',...period}),getGoogleContentTests({preset:'custom',...comparison})]);
 const groups=[...new Set(ads.map(ad=>ad.adGroup.id))];
 return {channel:'Google Search',period,comparison,source_captured_at:new Date(source.performance.capturedAt).toISOString(),campaigns,testing_label:source.inventory.label,current:current.filter(report=>campaigns.includes(report.campaignName)),previous:previous.filter(report=>campaigns.includes(report.campaignName)),ads,ad_metrics:groups.flatMap(group=>Object.entries(aggregateGoogleAdPerformance(archive,group,period,allowed)).map(([id,metrics])=>({id,group,...metrics}))),previous_ad_metrics:groups.flatMap(group=>Object.entries(aggregateGoogleAdPerformance(archive,group,comparison,allowed)).map(([id,metrics])=>({id,group,...metrics}))),daily:archive.days.filter(day=>allowed.has(day.adId)&&((day.date>=comparison.start&&day.date<=comparison.end)||(day.date>=period.start&&day.date<=period.end)))};
}

type TrialInput=ReturnType<typeof validatePromptRun>;
async function channelPacket(channel:string,input:TrialInput){
 if(channel==='google-search')return captureSearchTrial(input);
 const period={start:input.start,end:input.end},comparison=input.comparison??comparisonRange(period,'previousPeriod',input.end);
 if(channel==='google-pmax'||channel==='google-demand-gen'){
  const kind=channel==='google-pmax'?'pmax':'demand-gen',source=await readGoogleExpandedSharedSnapshot(kind);
  if(!source||period.end>source.end||comparison.end>source.end)throw Error(`${channel}: published data unavailable for these dates.`);
  const [now,before]=await Promise.all([getExpandedGoogleTesting(kind,{preset:'custom',...period}),getExpandedGoogleTesting(kind,{preset:'custom',...comparison})]);
  const campaigns=now.campaigns.filter(c=>input.campaign==='all'||c.name===input.campaign);if(!campaigns.length)throw Error('Campaign is outside the configured testing scope.');
  const names=campaigns.map(c=>c.name);
  return {channel,period,comparison,campaigns:names,current:campaigns,previous:before.campaigns.filter(c=>names.includes(c.name)),metric_contract:'Use Dashboard group testing totals. Per-asset associations are not additive. Never sum asset metrics into group totals.'};
 }
 if(channel==='social-media'){
  const source=await readTestingDataSnapshot<{posts:unknown[];capturedAt:string}>('social');if(!source?.payload?.posts)throw Error('Social lifetime snapshot unavailable.');
  return {channel,period:{label:'Lifetime'},comparison:null,campaigns:['social-selected-posts'],current:source.payload,previous:null};
 }
 const read=async(range:{start:string;end:string})=>{
  const data=await readComparisonPeriod(channel as TestingDataChannel,range) as {period?:{start:string;end:string};campaigns?:Array<{name?:string;campaignName?:string}>}|null;
  if(!data||data.period?.start!==range.start||data.period?.end!==range.end)throw Error(`${channel}: no published Dashboard snapshot for ${range.start}–${range.end}.`);
  return data;
 };
 const [now,before]=await Promise.all([read(period),read(comparison)]);
 const name=(c:{name?:string;campaignName?:string})=>c.campaignName??c.name??'';
 const current=(now.campaigns??[]).filter(c=>input.campaign==='all'||name(c)===input.campaign),names=current.map(name);if(!names.length)throw Error('Campaign is outside the configured testing scope.');
 return {channel,period,comparison,campaigns:names,current,previous:(before.campaigns??[]).filter(c=>names.includes(name(c))),metric_contract:'Use selected testing ads, including paused ads with historical delivery. Rates are recomputed from sums. EDM CTR uses unique clicks/delivered. Do not sum reach across days.'};
}
export async function capturePromptTrial(input:TrialInput):Promise<unknown>{
 if(input.channel!=='overview')return channelPacket(input.channel,input);
 const channels=await Promise.all(['google-search','google-pmax','google-demand-gen','meta','reddit','edm'].map(channel=>channelPacket(channel,{...input,channel,campaign:'all'})));
 return {channel:'overview',period:{start:input.start,end:input.end},comparison:input.comparison??comparisonRange(input,'previousPeriod',input.end),campaigns:[...new Set(channels.flatMap(c=>c.campaigns))],channels,instructions:'Analyze each channel using its captured prompt first; then synthesize Overview from those findings. Exclude Social from paid overview totals. Use testing Dashboard scope only.'};
}
