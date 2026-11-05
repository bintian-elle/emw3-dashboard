import {NextRequest} from 'next/server';
import {dashboardOwner} from '@/lib/ai-dashboard-access';
import {readComparisonPeriod,hasComparisonGoogleSnapshot} from '@/lib/testing-comparison.server';
import {comparisonMetricValues,type ComparisonPacket,type ComparisonMetrics} from '@/lib/testing-comparison';
import {testingSnapshotView} from '@/lib/testing-snapshot-watch';
import {getGoogleTestingPerformance} from '@/lib/google-testing-performance';
import {getExpandedGoogleTesting,expandedGoogleReports} from '@/lib/google-expanded-content-testing';
import {aggregateGoogleAdPerformance} from '@/lib/google-ad-performance';
import {readGoogleSearchSharedSnapshot,apiGoogleAdArchive} from '@/lib/google-testing-api';
import {overviewHeadlineMetrics} from '@/lib/overview-headline-metrics';
import {buildChannelPerformance} from '@/lib/channel-performance-data';
import {edmSpecialMetrics} from '@/lib/channel-special-performance-data';
import type {MetaCampaignTest} from '@/lib/testing-meta';
import type {RedditTestingData} from '@/lib/testing-reddit';
import type {EdmTestingData} from '@/lib/testing-edm';
const headers={'Cache-Control':'private, no-store'};
export async function GET(request:NextRequest){
 if(process.env.DEPLOYMENT_ENV!=='staging')return new Response(null,{status:404});
 try{await dashboardOwner(request);}catch{return Response.json({error:'Unauthorized'},{status:401,headers});}
 const params=request.nextUrl.searchParams,start=params.get('start')??'',end=params.get('end')??'',path=params.get('path')??'';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end||!Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(end)))return Response.json({error:'Invalid comparison dates'},{status:400,headers});
 const view=testingSnapshotView(path);if(!view||view==='social'||view==='inventory')return Response.json({error:'This view has no period comparison'},{status:400,headers});
 const period={start,end},input={preset:'custom' as const,...period},packet:ComparisonPacket={rows:{},period,unavailable:[]};
 const put=(channel:string,id:string,value:object)=>{packet.rows[`${channel}:${id}`]=comparisonMetricValues(value);};
 const isOverview=view==='overview';
 let search:Awaited<ReturnType<typeof getGoogleTestingPerformance>>|undefined,pmax:Awaited<ReturnType<typeof getExpandedGoogleTesting>>|undefined,dg:typeof pmax;
 const loaded:{meta?:MetaCampaignTest;reddit?:RedditTestingData;edm?:EdmTestingData}={};
 await Promise.all((['google-search','google-pmax','google-demand-gen','meta','reddit','edm'] as const).filter(channel=>isOverview||channel===view).map(async channel=>{
  try{
   if(channel==='google-search'){
    if(!await hasComparisonGoogleSnapshot(channel,period))throw Error('Missing published snapshot');
    search=await getGoogleTestingPerformance(input);
    for(const test of [...search.activeCards,...search.concluded.map(item=>item.report)])for(const group of test.groups)put(channel,group.adGroupId,group);
    const group=path.match(/\/google\/(?:search\/)?(\d+)$/)?.[1];
    if(group){const shared=await readGoogleSearchSharedSnapshot();if(shared){const allowed=new Set(shared.inventory.ads.map(row=>row.adGroupAd.ad.id));const archive=apiGoogleAdArchive(shared.performance);if(start<archive.range.start||end>archive.range.end)throw Error('Outside published history');for(const [id,metrics] of Object.entries(aggregateGoogleAdPerformance(archive,group,period,allowed)))put(channel,id,metrics);}}
   }else if(channel==='google-pmax'||channel==='google-demand-gen'){
    if(!await hasComparisonGoogleSnapshot(channel,period))throw Error('Missing published snapshot');
    const data=await getExpandedGoogleTesting(channel==='google-pmax'?'pmax':'demand-gen',input);if(channel==='google-pmax')pmax=data;else dg=data;
    for(const campaign of data.campaigns)for(const group of campaign.groups)for(const row of group.rows){put(channel,row.id,row.metrics);for(const asset of row.assetPerformance??[])put(channel,`${row.id}:${asset.assetId}:${asset.fieldType}`,asset.metrics);}
   }else{
    const data=await readComparisonPeriod(channel,period);if(!data)throw Error('Missing published period');
    if(channel==='meta'){const meta=loaded.meta=data as MetaCampaignTest;for(const group of meta.adGroups){put(channel,group.adGroupId,group);for(const ad of group.activeAds)put(channel,ad.adId,ad);}}
    if(channel==='reddit'){const reddit=loaded.reddit=data as RedditTestingData;for(const campaign of reddit.campaigns){put(channel,campaign.campaignId,campaign);for(const group of campaign.groups){put(channel,group.adGroupId,group);for(const ad of group.activeAds)put(channel,ad.adId,ad);}for(const format of ['Video','Image','Message'])for(const scope of [{id:'all',ads:campaign.groups.flatMap(group=>group.activeAds)},...campaign.groups.map(group=>({id:group.adGroupId,ads:group.activeAds}))]){const ads=scope.ads.filter(ad=>ad.contentType===format),sum=(key:'impressions'|'clicks'|'spend'|'revenue')=>ads.reduce((total,ad)=>total+ad[key],0),impressions=sum('impressions'),clicks=sum('clicks'),spend=sum('spend'),revenue=sum('revenue');put(channel,`format:${campaign.campaignId}:${scope.id}:${format}`,{impressions,revenue,cpc:clicks>0?spend/clicks:null,ctr:impressions>0?clicks/impressions:null,roas:spend>0?revenue/spend:null});}}}
    if(channel==='edm'){const edm=loaded.edm=data as EdmTestingData;for(const test of edm.tests)put(channel,test.variationId,test.hasData?{...test,'Total Revenue':test.revenue,'#Purchase':test.orders,'Click Rate':test.clickRate,'Module 2 CTR':test.secondModuleClickRate,'Open Rate':test.openRate,Delivered:test.delivered}:{});}
   }
  }catch{packet.unavailable.push(channel);}
 }));
 const {meta,reddit,edm}=loaded;
 if(isOverview){
  const zero={spend:0,revenue:0,orders:0,clicks:0,impressions:0,reach:null};
  const rows=buildChannelPerformance({search:search?[...search.activeCards,...search.concluded.map(item=>item.report)]:[],pmax:pmax?expandedGoogleReports(pmax):[],demandGen:dg?expandedGoogleReports(dg):[],meta:meta??{campaigns:[],totals:zero},reddit:reddit??{campaigns:[]},edm:edm??{campaigns:[],tests:[]},query:''});
  for(const row of rows)if(!packet.unavailable.includes(row.key))put('channel',row.key,row);
  if(edm)packet.rows['channel:edm']={...packet.rows['channel:edm'],...edmSpecialMetrics(edm.tests)} as ComparisonMetrics;
 }
 if(isOverview&&search&&pmax&&dg&&meta&&reddit&&edm){
  const searches=[...search.activeCards,...search.concluded.map(item=>item.report)],pmaxReports=expandedGoogleReports(pmax),dgReports=expandedGoogleReports(dg),google=[...searches,...pmaxReports,...dgReports];
  const headline=overviewHeadlineMetrics({google,meta,reddit,edm});
  const paidAssets=[...google.flatMap(test=>test.groups),...meta.adGroups.flatMap(group=>group.activeAds),...reddit.campaigns.flatMap(campaign=>campaign.groups.flatMap(group=>group.activeAds))];
  const allAssets=[...paidAssets,...edm.tests.map(test=>({orders:test.orders,clicks:test.clicks??0}))],cvrs=allAssets.filter(row=>row.clicks>0).map(row=>row.orders/row.clicks);
  const reaches=[...google.map(test=>test.reach),meta.totals.reach,...reddit.campaigns.map(campaign=>campaign.reach),edm.uniqueRecipients].filter((value):value is number=>value!=null);
  put('overview','headline',{...headline,reach:headline.totalReach,cvr:cvrs.length?cvrs.reduce((a,b)=>a+b,0)/cvrs.length:null,uniqueReach:reaches.length?reaches.reduce((a,b)=>a+b,0):null,assets:google.reduce((sum,test)=>sum+(test.adCount??test.groups.length),0)+meta.adGroups.reduce((sum,group)=>sum+group.activeAds.length,0)+reddit.campaigns.flatMap(campaign=>campaign.groups).reduce((sum,group)=>sum+group.activeAds.length,0)+edm.tests.length});

 }
 return Response.json(packet,{headers});
}
