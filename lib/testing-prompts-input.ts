import 'server-only';
import {insightSourceUrls} from './testing-insight-sources';
import {readFile} from 'node:fs/promises';
import {trialMetricRows} from './testing-prompt-trial-report';
import {testingPromptCatalog} from './testing-prompts-contract';
import type {PresentationDataset} from './testing-insight-presentation';
import {captureIntegratedPromptTrial} from './testing-prompts-presentation.server';
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
export async function capturePromptTrial(input:TrialInput,options:{allowIntegrated?:boolean}={}):Promise<unknown>{
 const integrated=options.allowIntegrated===false?null:await captureIntegratedPromptTrial(input);if(integrated)return integrated;
 if(input.channel!=='overview')return withVisualContext(await channelPacket(input.channel,input),input);
 const packets=await Promise.allSettled(['google-search','google-pmax','google-demand-gen','meta','reddit','edm'].map(channel=>channelPacket(channel,{...input,channel,campaign:'all'})));
 const channels=packets.flatMap(result=>result.status==='fulfilled'?[result.value]:[]);
 return withVisualContext({channel:'overview',period:{start:input.start,end:input.end},comparison:input.comparison??comparisonRange(input,'previousPeriod',input.end),campaigns:[],channels},input);
}

async function withVisualContext(packet:Awaited<ReturnType<typeof channelPacket>>|Record<string,unknown>,input:TrialInput){
 const campaigns=packet.campaigns as string[],entry=testingPromptCatalog.find(p=>p.id===input.channel)!;const prompt=await readFile(entry.file,'utf8');const sections=[...prompt.matchAll(/^##\s+\d+\.\s+(.+)$/gm)].slice(1).map((m,i)=>({id:`${input.channel}-${i+2}`,title:m[1]}));
 const datasets:Record<string,PresentationDataset>={input:{id:'input',scopes:['channel',...campaigns],xKey:'category',columns:{category:'category'},rows:[]}};
 const current=Array.isArray(packet.current)?packet.current:[];
 for(const name of campaigns){const item=current.find((c:Record<string,unknown>)=>c.name===name||c.campaignName===name);const rows=trialMetricRows(item??(campaigns.length===1?packet.current:null));if(!rows.length)continue;const columns:Record<string,string>={category:'category'};for(const row of rows)for(const key of Object.keys(row))if(key!=='category')columns[key]=['spend','revenue','cpc','cpa','cpm'].includes(key)?'USD':['ctr','cvr'].includes(key)?'fraction':key==='roas'?'ratio':key;const id=name+'.entities';datasets[id]={id,scopes:[name,'channel'],xKey:'category',columns,rows};}
 const period={start:input.start,end:input.end},comparison=packet.comparison??{start:'',end:''};const names=input.channel==='overview'?[]:campaigns;const urls=insightSourceUrls(packet);
 return {...packet,campaigns:names,tests:names.map((name)=>({test_id:name,data:current.find((c:Record<string,unknown>)=>c.name===name||c.campaignName===name)??packet.current})),sections,presentation_datasets:datasets,media_index:[],visual_context:{run_id:'trial',channel:packet.channel,scope:input.channel==='social-media'?'lifetime':'period',period,comparison,currency:null,totals:{},datasets,source_urls:[...urls],media:[],sections}};
}
