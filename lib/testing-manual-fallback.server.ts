import 'server-only';
import {readFile} from 'node:fs/promises';import path from 'node:path';
import {readComparisonPeriod} from './testing-comparison.server';
import {readTestingDataSnapshot} from './testing-data-cache';
import {getTestingInventory} from './testing-inventory';
import type {TestingDataChannel} from './testing-data-cache-contract';
import {socialPostsForReport,type TestingReportRange} from './testing-report-scope';
import {createTestingDataGateway} from './testing-scoped-fetch';
import type {TestingReportChannel} from './testing-report-scope';
import {fetchSocialPaidForPeriod,type SocialPerformance} from './testing-social';
import {selectCampaignEvidence} from './testing-campaign-evidence';

async function fetchBoundedChannel(channel:TestingReportChannel,range:TestingReportRange){
 const input={preset:'custom' as const,...range};
 if(channel==='google-search'){
  const {getGoogleContentTests}=await import('./testing-google');
  const campaigns=await getGoogleContentTests(input);
  if(campaigns.some(campaign=>campaign.period?.start!==range.start||campaign.period?.end!==range.end))throw Error('Testing data period mismatch');
  return {period:range,campaigns};
 }
 if(channel==='google-pmax'||channel==='google-demand-gen'){
  const {getExpandedGoogleTesting}=await import('./google-expanded-content-testing');
  return getExpandedGoogleTesting(channel==='google-pmax'?'pmax':'demand-gen',input);
 }
 if(channel==='meta')return (await (await import('./testing-meta')).fetchFreshMetaCampaignTest(input)).data;
 if(channel==='reddit')return (await (await import('./testing-reddit')).fetchFreshRedditTestingData(input)).data;
 if(channel==='edm')return (await (await import('./testing-edm')).fetchFreshEdmTestingSnapshot(input)).data;
 throw Error('Period-bounded social metrics unavailable');
}
/** Supply any matching dashboard snapshots and identities; the prompt directs the AI to fill missing data via its API access. */
export async function captureManualFallback(input:{channel:string;campaign:string;start:string;end:string;comparison:{start:string;end:string}|null},scope?:{testStart:string|null;current:TestingReportRange|null;previous:TestingReportRange|null},publishedCurrent?:unknown){
 const channel=input.channel,period={start:input.start,end:input.end},comparison=input.comparison??{start:'',end:''};
 let campaigns:string[]=[];if(input.campaign!=='all'){const inventory=await getTestingInventory();if(!inventory.items.some(item=>item.channelKey===channel&&item.name===input.campaign))throw Error('Campaign is outside the configured testing scope.');campaigns=[input.campaign];}else if(channel==='social-media')campaigns=[];else if(channel!=='overview'){const inventory=await getTestingInventory();if(inventory.unavailable.includes(channel as never))throw Error(`Campaign inventory is unavailable for ${channel}`);campaigns=inventory.items.filter(item=>item.channelKey===channel).map(item=>item.name);if(!campaigns.length)throw Error(`Campaign inventory is empty for ${channel}`);}
 const prompt=await readFile(path.join(process.cwd(),'prompts/content-testing',`${channel}.md`),'utf8');const sections=[...prompt.matchAll(/^##\s+\d+\.\s+(.+)$/gm)].slice(1).map((m,i)=>({id:`${channel}-${i+2}`,title:m[1]}));
 const storageChannel=(channel==='social-media'?'social':channel) as TestingDataChannel;
 const ranges=scope?[scope.current,scope.previous]:[period,comparison];
 // Social snapshots are lifetime totals: they cannot establish metrics at a past period end.
 const snapshots=channel==='overview'||channel==='social-media'||channel.startsWith('google-')?[]:await Promise.allSettled(ranges.map((range,index)=>index===0&&publishedCurrent!==undefined?Promise.resolve(publishedCurrent):range?readComparisonPeriod(storageChannel,range):Promise.resolve(null)));
 const dashboard:Array<{period:TestingReportRange|null; snapshot?:unknown; unavailable?:true; source?:'api'}>=snapshots.map((result,index)=>{
  const snapshot=result.status==='fulfilled'?result.value as {period?:TestingReportRange}|null:null;
  const actual=snapshot?.period;
  const expected=ranges[index];
  if(snapshot&&expected&&actual?.start===expected.start&&actual.end===expected.end){
   try{return {period:expected,snapshot:input.campaign==='all'?snapshot:selectCampaignEvidence(snapshot as {period:TestingReportRange;campaigns:Array<{name?:string;campaignName?:string}>},input.campaign)};}catch{/* Fall back to a scoped API request. */}
  }
  return {period:expected,unavailable:true};
 });
 if(scope&&channel!=='overview'&&channel!=='social-media'){
  const request={channel:channel as TestingReportChannel,current:scope.current??period,previous:scope.previous};
  const fetchPeriod=createTestingDataGateway(request,range=>fetchBoundedChannel(request.channel,range));
  const indexed=await Promise.all((['current','previous'] as const).map(async(which,index):Promise<(typeof dashboard)[number]>=>{
   const existing=dashboard[index];if(existing&&!existing.unavailable)return existing;
   if(!ranges[index])return {period:null,unavailable:true};
   try{
    const data=await fetchPeriod(which);
    const selected=data&&input.campaign!=='all'?selectCampaignEvidence(data as {period:TestingReportRange;campaigns:Array<{name?:string;campaignName?:string}>},input.campaign):data;
    return {period:ranges[index],...(selected?{snapshot:selected,source:'api'}:{unavailable:true})};
   }catch{return {period:ranges[index],unavailable:true};}
  }));
  dashboard.splice(0,dashboard.length,...indexed);
 }
 const lifetime=channel==='social-media'&&publishedCurrent!==undefined?publishedCurrent as SocialPerformance:null;
 let social_posts:unknown=undefined;
 if(channel==='social-media'&&scope&&!lifetime){
  const source=await readTestingDataSnapshot<SocialPerformance>('social').catch(()=>null);
  if(source?.payload?.posts){
   const posts=source.payload.posts;
   social_posts={current:socialPostsForReport(posts,scope.current),previous:socialPostsForReport(posts,scope.previous)};
   // Bound the extra Ads Insights requests to weekly and longer reporting windows.
   const days=(Date.parse(period.end)-Date.parse(period.start))/86400000+1;
   const captures=await Promise.allSettled(ranges.map(range=>range&&days>=7?fetchSocialPaidForPeriod(posts,range):null));
   for(const [index,capture] of captures.entries()){
    const range=ranges[index];
    if(range&&capture.status==='fulfilled'&&capture.value){
     dashboard.push({period:range,snapshot:{posts:capture.value},source:'api'});
    }else dashboard.push({period:range,unavailable:true});
   }
  }
 }
 const datasets={input:{id:'input',scopes:['channel',...campaigns],xKey:'category',columns:{category:'category'},rows:[]}};
 const gaps=channel==='social-media'&&!lifetime?['Instagram Media Insights provides current cumulative metrics. Historical Organic values are unavailable without matching snapshots. Any bounded API rows in dashboard are Paid only.']:dashboard.some(item=>item.unavailable&&item.period)?['Some requested dashboard snapshots are unavailable.']:[];
 return {channel,period,comparison,campaigns,dashboard,tests:campaigns.map(test_id=>({test_id})),presentation_datasets:datasets,media_index:[],...(scope?{testing_scope:scope}:{}),...(social_posts?{social_posts}:{}),...(lifetime?{social_lifetime_snapshot:lifetime}:{}),source_data_gaps:gaps,visual_context:{run_id:'manual',channel,scope:lifetime?'lifetime':'period',period,comparison,currency:null,totals:{},datasets,source_urls:lifetime?.posts.map(post=>post.url)??[],media:[],sections}};
}
