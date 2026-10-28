import {aggregatePaidOverview} from "@/lib/overview-metrics";
import {overviewHeadlineMetrics,formatOverviewHeadlineMetrics,type OverviewHeadlineMetrics} from "@/lib/overview-headline-metrics";
import type { EdmTestingData } from "@/lib/testing-edm";
import type { GoogleSearchTest } from "@/lib/testing-google";
import type { MetaCampaignTest } from "@/lib/testing-meta";
import type { RedditTestingData } from "@/lib/testing-reddit";
import {MetricBreakdown} from "./metric-breakdown";
import {MetricTrendCard as MetricCard,type MetricTrendSegment} from "./metric-trend-card";
import type {OverviewTrends} from "@/lib/overview-daily-metrics";

type Metric={spend:number;revenue:number;orders:number;clicks:number};
type Segment=MetricTrendSegment;
const channelStyle={Google:{color:"stroke-chart-4",dot:"bg-chart-4"},Meta:{color:"stroke-chart-5",dot:"bg-chart-5"},Reddit:{color:"stroke-chart-3",dot:"bg-chart-3"},EDM:{color:"stroke-chart-2",dot:"bg-chart-2"}};
const assetStyle={Mixed:{color:"stroke-chart-1",dot:"bg-chart-1"},Message:{color:"stroke-chart-2",dot:"bg-chart-2"},Picture:{color:"stroke-chart-3",dot:"bg-chart-3"},Video:{color:"stroke-chart-5",dot:"bg-chart-5"}};
const currency=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}),number=new Intl.NumberFormat("en-US",{maximumFractionDigits:0}),percent=new Intl.NumberFormat("en-US",{style:"percent",minimumFractionDigits:2,maximumFractionDigits:2});
const preciseCurrency=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2});
const empty=():Metric=>({spend:0,revenue:0,orders:0,clicks:0});
const add=(target:Metric,row:Metric)=>{target.spend+=row.spend;target.revenue+=row.revenue;target.orders+=row.orders;target.clicks+=row.clicks;};
const ratio=(a:number,b:number)=>b>0?a/b:null;
const showRatio=(value:number|null,suffix="")=>value==null?"—":`${value.toFixed(2)}${suffix}`;


export function BusinessPerformance({google,meta,reddit,edm,headlineMetrics,trends}:{google:GoogleSearchTest[];meta:MetaCampaignTest;reddit:RedditTestingData;edm:EdmTestingData;headlineMetrics?:OverviewHeadlineMetrics;trends:Promise<OverviewTrends>}){
  const headline=formatOverviewHeadlineMetrics(headlineMetrics??overviewHeadlineMetrics({google,meta,reddit,edm}));
  const searchGroups=google.flatMap(test=>test.groups);
  const channels:Record<keyof typeof channelStyle,Metric>={Google:empty(),Meta:empty(),Reddit:empty(),EDM:empty()};
  searchGroups.forEach(row=>add(channels.Google,row));add(channels.Meta,meta.totals);reddit.campaigns.flatMap(campaign=>campaign.groups).flatMap(group=>group.activeAds).forEach(row=>add(channels.Reddit,row));edm.tests.forEach(row=>add(channels.EDM,{spend:0,revenue:row.revenue,orders:row.orders,clicks:row.clicks??0}));
  const paid=aggregatePaidOverview([...searchGroups,meta.totals,...reddit.campaigns.flatMap(campaign=>campaign.groups).flatMap(group=>group.activeAds)]);
  const metaReach=meta.totals.reach;
  const redditReach=reddit.campaigns.length&&reddit.campaigns.every(campaign=>Number.isFinite(campaign.reach))?reddit.campaigns.reduce((sum,campaign)=>sum+campaign.reach,0):null;
  const googleValues=google.map(campaign=>campaign.reach).filter((value):value is number=>value!=null);
  const googleReach=googleValues.length?googleValues.reduce((sum,value)=>sum+value,0):null;
  const edmDelivered=edm.tests.reduce((sum,test)=>sum+test.delivered,0);
  const edmUniqueClicks=edm.tests.reduce((sum,test)=>sum+(test.clicks??0),0);
  const edmCtr=edmDelivered>0&&edm.tests.every(test=>test.clicks!=null)?edmUniqueClicks/edmDelivered:null;
  const uniqueValues=[googleReach,metaReach,redditReach,edm.uniqueRecipients].filter((value):value is number=>value!=null);
  const uniqueReach=uniqueValues.length?uniqueValues.reduce((sum,value)=>sum+value,0):null;
  const uniqueSegments:Segment[]=[{label:"Google",value:googleReach??0,display:googleReach==null?"—":number.format(googleReach),...channelStyle.Google},{label:"Meta",value:metaReach??0,display:metaReach==null?"—":number.format(metaReach),...channelStyle.Meta},{label:"Reddit",value:redditReach??0,display:redditReach==null?"—":number.format(redditReach),...channelStyle.Reddit},{label:"EDM",value:edm.uniqueRecipients??0,display:edm.uniqueRecipients==null?"—":number.format(edm.uniqueRecipients),...channelStyle.EDM}];
  const reachSegments:Segment[]=[{label:"EDM",value:edmDelivered,display:number.format(edmDelivered),...channelStyle.EDM},{label:"Google",value:googleReach??0,display:googleReach==null?"—":number.format(googleReach),...channelStyle.Google},{label:"Meta",value:metaReach??0,display:metaReach==null?"—":number.format(metaReach),...channelStyle.Meta},{label:"Reddit",value:redditReach??0,display:redditReach==null?"—":number.format(redditReach),...channelStyle.Reddit}];
  const ctrSegments:Segment[]=[{label:"Google",rows:google.filter(test=>test.channel!=="pmax").flatMap(test=>test.groups)},{label:"Meta",rows:[meta.totals]},{label:"Reddit",rows:reddit.campaigns.flatMap(campaign=>campaign.groups).flatMap(group=>group.activeAds)}].map(({label,rows})=>{const result=aggregatePaidOverview(rows);return {label,note:label==="Google"?"excl. PMAX":undefined,value:result.impressions??0,display:result.ctr==null?"—":percent.format(result.ctr),...channelStyle[label as keyof typeof channelStyle]};});
  ctrSegments.push({label:"EDM",note:edmDelivered===0?"Delivered 0":"email only",value:edmDelivered,display:edmCtr==null?"—":percent.format(edmCtr),...channelStyle.EDM});
  const assetCounts={Mixed:0,Message:edm.tests.length,Picture:0,Video:0};
  google.forEach(test=>{assetCounts[test.creativeType??"Message"]+=test.adCount??test.groups.length;});
  const assetMetrics:Record<keyof typeof assetStyle,Metric>={Mixed:empty(),Message:empty(),Picture:empty(),Video:empty()},paidAssetMetrics:Record<keyof typeof assetStyle,Metric>={Mixed:empty(),Message:empty(),Picture:empty(),Video:empty()};
  const assetRows:Array<Metric&{type:keyof typeof assetStyle;paid:boolean}>=[];
  google.forEach(test=>test.groups.forEach(row=>assetRows.push({...row,type:test.creativeType??"Message",paid:true})));
  meta.adGroups.flatMap(group=>group.activeAds).forEach(row=>{assetCounts[row.mediaType==="Image"?"Picture":"Video"]++;assetRows.push({...row,type:row.mediaType==="Image"?"Picture":"Video",paid:true});});
  reddit.campaigns.flatMap(campaign=>campaign.groups).flatMap(group=>group.activeAds).forEach(row=>{const type=row.contentType==="Image"?"Picture":row.contentType==="Video"?"Video":"Message";assetCounts[type]++;assetRows.push({...row,type,paid:true});});
  edm.tests.forEach(row=>assetRows.push({spend:0,revenue:row.revenue,orders:row.orders,clicks:row.clicks??0,type:"Message",paid:false}));
  assetRows.forEach(row=>{add(assetMetrics[row.type],row);if(row.paid)add(paidAssetMetrics[row.type],row);});
  const averageCvr=(()=>{const values=assetRows.filter(row=>row.clicks>0).map(row=>row.orders/row.clicks);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;})();
  const channelSegments=(metric:"revenue"|"orders",formatter:(value:number)=>string):Segment[]=>(Object.keys(channelStyle) as Array<keyof typeof channelStyle>).map(label=>({label,value:channels[label][metric],display:formatter(channels[label][metric]),...channelStyle[label]}));
  const channelRoas:Segment[]=(Object.keys(channelStyle) as Array<keyof typeof channelStyle>).map(label=>({label,value:channels[label].spend,display:showRatio(ratio(channels[label].revenue,channels[label].spend)),...channelStyle[label]}));
  const channelCvr:Segment[]=(Object.keys(channelStyle) as Array<keyof typeof channelStyle>).map(label=>({label,value:channels[label].clicks,display:channels[label].clicks?percent.format(channels[label].orders/channels[label].clicks):"—",...channelStyle[label]}));
  const assetRoas:Segment[]=(Object.keys(assetStyle) as Array<keyof typeof assetStyle>).map(label=>({label,value:paidAssetMetrics[label].spend,display:showRatio(ratio(paidAssetMetrics[label].revenue,paidAssetMetrics[label].spend)),...assetStyle[label]}));
  const assetCvr:Segment[]=(Object.keys(assetStyle) as Array<keyof typeof assetStyle>).map(label=>({label,value:assetMetrics[label].clicks,display:assetMetrics[label].clicks?percent.format(assetMetrics[label].orders/assetMetrics[label].clicks):"—",...assetStyle[label]}));
  const countSegments:Segment[]=(Object.keys(assetStyle) as Array<keyof typeof assetStyle>).map(label=>({label,value:assetCounts[label],display:number.format(assetCounts[label]),...assetStyle[label]}));
  return <section aria-labelledby="overview-metrics"><h2 id="overview-metrics" className="scroll-mt-32 text-title-2-semibold text-text-primary">Business Performance</h2><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6"><MetricCard title="Total Number of Assets" metric="assets" trends={trends} value={number.format(Object.values(assetCounts).reduce((a,b)=>a+b,0))} className="xl:col-span-2" caption="Tested assets" segments={countSegments} /><MetricCard title="Total Revenue" metric="revenue" trends={trends} value={headline.revenue} className="xl:col-span-2" caption="Attributed revenue" segments={channelSegments("revenue",currency.format)} /><MetricCard title="Total Orders" metric="orders" trends={trends} value={headline.orders} className="xl:col-span-2" caption="Attributed orders" segments={channelSegments("orders",number.format)} /><MetricCard className="xl:col-span-2" title="Total Reach" metric="reach" trends={trends} value={headline.totalReach} caption="Reach" segments={reachSegments} ></MetricCard><MetricCard className="xl:col-span-2" title="Unique Reach" metric="uniqueReach" trends={trends} value={uniqueReach==null?"—":number.format(uniqueReach)} caption="Unique Reach" segments={uniqueSegments} /><MetricCard className="xl:col-span-2" title="CTR" metric="ctr" trends={trends} value={headline.ctr} caption="Ad clicks / ad impressions · excludes PMAX and EDM" segments={ctrSegments} /><MetricCard className="xl:col-span-3" title="Total ROAS" detailsBeforeChannels metric="roas" trends={trends} value={headline.roas} caption="Paid conversion value / paid spend" segments={channelRoas} ><p className="mt-2 text-caption-1-regular text-text-secondary">{preciseCurrency.format(paid.revenue)} conversion value / {preciseCurrency.format(paid.spend)} spend · Google, Meta, Reddit</p><MetricBreakdown assets={assetRoas}/></MetricCard><MetricCard className="xl:col-span-3" title="Total Conversion Rate" detailsBeforeChannels metric="cvr" trends={trends} value={averageCvr==null?"—":percent.format(averageCvr)} caption="Average asset conversion rate" segments={channelCvr} ><MetricBreakdown assets={assetCvr}/></MetricCard></div></section>;
}
