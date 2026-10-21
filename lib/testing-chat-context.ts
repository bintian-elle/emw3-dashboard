import "server-only";
import { getGoogleContentTests } from "@/lib/testing-google";
import { getExpandedGoogleTesting } from "@/lib/google-expanded-content-testing";
import { getMetaCampaignTest } from "@/lib/testing-meta";
import { redditContentPeriod } from "@/lib/reddit-content-testing";
import { getRedditContentTestingData } from "@/lib/testing-reddit";
import { getEdmTestingData } from "@/lib/testing-edm";
import { getSocialPerformance } from "@/lib/testing-social";
import { concludedTestsForChannel } from "@/lib/concluded-tests";
import { readConcludedSnapshot } from "@/lib/concluded-test-snapshot";
import { readTestingReadoutCache } from "@/lib/ai-job-queue";
import { testingReadoutKey } from "@/lib/testing-readout-contract";
import { googleContentTestingInventory } from "@/lib/google-content-testing-scope";
import { readGoogleAdPerformanceArchive } from "@/lib/google-ad-performance-archive";
import { aggregateGoogleAdPerformance } from "@/lib/google-ad-performance";
import { apiGoogleAdArchive, readGoogleTestingApiData } from "@/lib/google-testing-api";
import type { TestingChatScope, TestingChatChannel } from "@/lib/testing-chat-contract";

type Test = { campaign: string; channel: TestingChatChannel; data: unknown };
type NavigationLink = { label: string; href: string; entityId?: string };
function compact(value: unknown): unknown {
 if(Array.isArray(value))return value.map(compact);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['html','resourceName','policySummaryInfo','thumbnailUrl','videoUrl','thumbnail_url','image_url'].includes(key)).map(([key,item])=>[key,compact(item)]));
 return value;
}
export async function loadTestingChatContext(scope: TestingChatScope, comparisons: string[] = []) {
 const input={preset:'custom' as const,start:scope.period.start,end:scope.period.end};
 const tests:Test[]=[], gaps:string[]=[],links:NavigationLink[]=[];
 const exactPeriod=(period:{start:string;end:string}|null|undefined)=>{if(!period||period.start!==input.start||period.end!==input.end)throw Error('The selected dates do not match the available reporting period. Use the page dates before asking.');};
 const query=new URLSearchParams({period:'custom',start:input.start,end:input.end}).toString();
 const chosen=(name:string)=>!scope.campaign||name===scope.campaign||comparisons.includes(name);
 const wanted=(channel:TestingChatChannel)=>scope.channel==='overview'||scope.channel===channel||comparisons.length>0;
 const add=(channel:TestingChatChannel,campaign:string,data:unknown)=>{if(chosen(campaign))tests.push({channel,campaign,data:compact(data)});};
 const tasks:Array<Promise<void>>=[];
 if(wanted('google-search')&&scope.channel!=='concluded')tasks.push((async()=>{
  const reports=await getGoogleContentTests(input);
  for(const report of reports)exactPeriod(report.period);
  const inventory=await googleContentTestingInventory();
  let archive=await readGoogleAdPerformanceArchive();
  if(!archive||input.start<archive.range.start||input.end>archive.range.end)archive=apiGoogleAdArchive(await readGoogleTestingApiData());
  for(const report of reports.filter(r=>chosen(r.campaignName))){
   const ads=inventory.ads.filter(row=>row.campaign.name===report.campaignName);
   add('google-search',report.campaignName,{...report,ads:ads.map(row=>({...row,metrics:aggregateGoogleAdPerformance(archive!,row.adGroup.id,input,new Set(ads.map(ad=>ad.adGroupAd.ad.id)))[row.adGroupAd.ad.id]??null}))});
   for(const row of ads)links.push({entityId:row.adGroupAd.ad.id,label:row.adGroupAd.ad.name||row.adGroupAd.ad.responsiveSearchAd?.headlines?.[0]?.text||row.adGroupAd.ad.id,href:`/bluevua/testing/google/search/${row.adGroup.id}?${query}#ad-${row.adGroupAd.ad.id}`});
  }
 })());
 for(const [channel,kind] of [['google-pmax','pmax'],['google-demand-gen','demand-gen']] as const)if(wanted(channel)&&scope.channel!=='concluded')tasks.push((async()=>{
  const data=await getExpandedGoogleTesting(kind,input);exactPeriod(data.period);
  for(const campaign of data.campaigns.filter(c=>chosen(c.name))){add(channel,campaign.name,campaign);for(const group of campaign.groups)for(const row of group.rows)links.push({entityId:row.id,label:row.name,href:`/bluevua/testing/google/${kind}/${row.id}?${query}`});}
 })());
 if(wanted('meta')&&scope.channel!=='concluded')tasks.push((async()=>{const data=await getMetaCampaignTest(input);exactPeriod(data.period);for(const campaign of data.campaigns.filter(c=>chosen(c.campaignName))){add('meta',campaign.campaignName,campaign);for(const group of campaign.adGroups)for(const ad of group.activeAds)links.push({label:ad.name,entityId:ad.adId,href:`/bluevua/testing/meta/${group.adGroupId}?${query}#ad-${ad.adId}`});}})());
 if(wanted('reddit')&&scope.channel!=='concluded')tasks.push((async()=>{
  // Explicit dates preserve the selected lifetime endpoint, even if midnight passes.
  const lifetime=scope.channel==='reddit'&&scope.period.label.startsWith('Lifetime');
  const actual=lifetime?redditContentPeriod():null;
  if(actual&&(actual.start!==input.start||actual.end!==input.end))throw Error('Reddit lifetime dates have changed. Use the current page dates.');
  const data=await getRedditContentTestingData(lifetime?{preset:'sinceSep24'}:input);exactPeriod(data.period);
  for(const campaign of data.campaigns.filter(c=>chosen(c.name))){add('reddit',campaign.name,campaign);for(const group of campaign.groups)for(const ad of group.activeAds)links.push({label:ad.name,entityId:ad.adId,href:`/bluevua/testing/reddit/${group.adGroupId}?${query}#ad-${ad.adId}`});}
 })());
 if(wanted('edm')&&scope.channel!=='concluded')tasks.push((async()=>{const data=await getEdmTestingData(input);exactPeriod(data.period);for(const campaign of data.campaigns.filter(c=>chosen(c.campaignName))){add('edm',campaign.campaignName,campaign);links.push({label:campaign.campaignName,href:`/bluevua/testing/edm?${query}`});}})());
 if(scope.channel==='social')tasks.push((async()=>{const data=await getSocialPerformance();add('social','social-selected-posts',{...data,metric_period:'Lifetime, independent of reporting selector'});for(const post of data.posts)links.push({label:post.caption.slice(0,80)||post.code,entityId:post.code,href:post.url});})());
 if(scope.channel==='concluded'||scope.period.concludedTestId)tasks.push((async()=>{for(const definition of concludedTestsForChannel('Google Search').filter(t=>chosen(t.campaignName))){const snapshot=await readConcludedSnapshot(definition.id);if(!snapshot?.finalized)continue;if(scope.campaign&&(snapshot.report.period?.start!==input.start||snapshot.report.period.end!==input.end))throw Error('Select the finalized test lifetime.');add('concluded',definition.campaignName,{definition,report:snapshot.report,dailyGroups:snapshot.dailyGroups});links.push({label:definition.name,href:'/bluevua/testing/concluded/google-search'});if(definition.resourcesHref)links.push({label:'Google Drive · Test materials',href:definition.resourcesHref});}})());
 const results=await Promise.allSettled(tasks);results.forEach(result=>{if(result.status==='rejected')gaps.push(result.reason instanceof Error?result.reason.message:'Channel data unavailable');});
 if(!tests.length)throw Error(gaps[0]||'The selected campaign has no available data for this scope.');
 if(scope.campaign&&!tests.some(t=>t.campaign===scope.campaign))throw Error('The selected campaign is unavailable for this page and date range.');
 const concluded=scope.period.concludedTestId??(scope.channel==='concluded'?concludedTestsForChannel('Google Search').find(t=>t.campaignName===scope.campaign)?.id:undefined);
 const key=testingReadoutKey({...scope.period,...(concluded?{concludedTestId:concluded}:{})});
 const permanentKeys=scope.channel==='concluded'?concludedTestsForChannel('Google Search').filter(t=>tests.some(test=>test.campaign===t.campaignName)).map(t=>`period:concluded:${t.id}`):[];
 const saved=await readTestingReadoutCache([...new Set([concluded?`period:concluded:${concluded}`:'framework:v1',...(key?[key]:[]),...permanentKeys])]);
 const names=new Set(tests.map(t=>t.campaign));
 const readouts=saved.map(row=>{const payload=row.payload as Record<string,unknown>;return {key:row.cache_key,period_start:row.period_start,period_end:row.period_end,...Object.fromEntries(Object.entries(payload).filter(([field])=>!['tests','test_frameworks','channel_frameworks'].includes(field)&&(!scope.campaign||field!=='overview'))),tests:(payload.tests as Array<{campaign_name?:string;test_id:string}>|undefined)?.filter(t=>names.has(t.test_id)||names.has(t.campaign_name??'')),test_frameworks:(payload.test_frameworks as Array<{campaign_name?:string;test_id:string}>|undefined)?.filter(t=>names.has(t.test_id)||names.has(t.campaign_name??''))};});
 function count(value:unknown):number {if(!value||typeof value!=='object')return 0;if(Array.isArray(value))return value.reduce((n,v)=>n+count(v),0);const row=value as Record<string,unknown>;if(typeof row.adId==='string')return 1;if(row.adGroupAd&&typeof row.adGroupAd==='object')return 1;return Object.values(row).reduce<number>((n,v)=>n+count(v),0);}
 return {scope,view_context:{page:scope.page,visible_entities:links.filter(link=>link.href.split('?')[0]===scope.page)},tests,data_gaps:gaps,navigation_links:links,saved_analysis:readouts,entity_count:Math.max(1,tests.reduce((n,t)=>n+count(t.data),0)),metric_contract:{rates:'Decimal fractions in raw data; saved analytical rates may use percent units. Recompute ROAS=sum revenue/sum spend; CTR=clicks/impressions. EDM CTR=unique clicks/delivered; module CTR needs module denominator. Never sum ad/daily reach to claim unique people.',paid_roas:'Paid ROAS excludes EDM and Social revenue: sum reported Google/Meta/Reddit conversion value divided by their summed spend, for the supplied scope only. Account for attribution overlap without averaging channel ROAS.',scope:'Exact supplied period only. Missing metrics are unavailable, not zero. Saved analysis is historical unless dates match. No current-period backfill from chat history.'}};
}
