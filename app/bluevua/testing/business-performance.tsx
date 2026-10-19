import {aggregatePaidOverview,aggregateOverviewCtr} from "@/lib/overview-metrics";
import type { EdmTestingData } from "@/lib/testing-edm";
import type { GoogleSearchTest } from "@/lib/testing-google";
import type { MetaCampaignTest } from "@/lib/testing-meta";
import type { RedditTestingData } from "@/lib/testing-reddit";
import { cx } from "@/utils/cx";
import { SegmentedGauge, type GaugeSegment } from "./segmented-gauge";

type Metric={spend:number;revenue:number;orders:number;clicks:number};
type Segment=GaugeSegment;
const channelStyle={Google:{color:"stroke-chart-4",dot:"bg-chart-4"},Meta:{color:"stroke-chart-5",dot:"bg-chart-5"},Reddit:{color:"stroke-chart-3",dot:"bg-chart-3"},EDM:{color:"stroke-chart-8",dot:"bg-chart-8"}};
const assetStyle={Mixed:{color:"stroke-chart-1",dot:"bg-chart-1"},Message:{color:"stroke-chart-2",dot:"bg-chart-2"},Picture:{color:"stroke-chart-3",dot:"bg-chart-3"},Video:{color:"stroke-chart-5",dot:"bg-chart-5"}};
const currency=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}),number=new Intl.NumberFormat("en-US",{maximumFractionDigits:0}),percent=new Intl.NumberFormat("en-US",{style:"percent",minimumFractionDigits:2,maximumFractionDigits:2});
const preciseCurrency=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2});
const empty=():Metric=>({spend:0,revenue:0,orders:0,clicks:0});
const add=(target:Metric,row:Metric)=>{target.spend+=row.spend;target.revenue+=row.revenue;target.orders+=row.orders;target.clicks+=row.clicks;};
const ratio=(a:number,b:number)=>b>0?a/b:null;
const showRatio=(value:number|null,suffix="")=>value==null?"—":`${value.toFixed(2)}${suffix}`;

function MetricCard({title,value,caption,segments,children,className,preserveTotal=false,showDistribution=true}:{title:string;value:string;caption:string;segments:Segment[];children?:React.ReactNode;className?:string;preserveTotal?:boolean;showDistribution?:boolean}){return <article className={cx("min-w-0 rounded-3xl border border-border-button-default bg-background-primary-default p-4 shadow-card",className)}><SegmentedGauge title={title} segments={segments} value={value} caption={caption} preserveTotal={preserveTotal} showDistribution={showDistribution} compact/>{children}</article>;}
function DetailRow({title,items}:{title:string;items:Segment[]}){return <div className="mt-3 border-t border-separator-border pt-3"><p className="text-caption-1-semibold text-text-tertiary">{title}</p><div className="mt-2 flex flex-wrap gap-2">{items.map(item=><span key={item.label} className="inline-flex items-center gap-1.5 rounded-full bg-background-secondary-default px-3 py-1.5 text-caption-1-semibold text-text-secondary"><span className={cx("size-2 rounded-full",item.dot)}/>{item.label}<span className="text-text-primary">{item.display}</span></span>)}</div></div>;}

export function BusinessPerformance({google,meta,reddit,edm}:{google:GoogleSearchTest[];meta:MetaCampaignTest;reddit:RedditTestingData;edm:EdmTestingData}){
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
  const overallCtr=aggregateOverviewCtr(paid,{uniqueClicks:edmUniqueClicks,delivered:edmDelivered});
  if(edm.tests.some(test=>test.clicks==null))overallCtr.ctr=null;
  const knownReach=[googleReach,metaReach,redditReach,edmDelivered].filter((value):value is number=>value!=null);
  const totalReach=knownReach.length?knownReach.reduce((sum,value)=>sum+value,0):null;
  const reachSegments:Segment[]=[{label:"EDM",value:edmDelivered,display:number.format(edmDelivered),...channelStyle.EDM},{label:"Google",value:googleReach??0,display:googleReach==null?"—":number.format(googleReach),...channelStyle.Google},{label:"Meta",value:metaReach??0,display:metaReach==null?"—":number.format(metaReach),...channelStyle.Meta},{label:"Reddit",value:redditReach??0,display:redditReach==null?"—":number.format(redditReach),...channelStyle.Reddit}];
  const ctrSegments:Segment[]=[{label:"Google",rows:searchGroups},{label:"Meta",rows:[meta.totals]},{label:"Reddit",rows:reddit.campaigns.flatMap(campaign=>campaign.groups).flatMap(group=>group.activeAds)}].map(({label,rows})=>{const result=aggregatePaidOverview(rows);return {label,value:result.impressions,display:result.ctr==null?"—":percent.format(result.ctr),...channelStyle[label as keyof typeof channelStyle]};});
  ctrSegments.push({label:"EDM",value:edmDelivered,display:edmCtr==null?"—":percent.format(edmCtr),...channelStyle.EDM});
  const assetCounts={Mixed:0,Message:edm.tests.length,Picture:0,Video:0};
  google.forEach(test=>{assetCounts[test.creativeType??"Message"]+=test.adCount??test.groups.length;});
  const assetMetrics:Record<keyof typeof assetStyle,Metric>={Mixed:empty(),Message:empty(),Picture:empty(),Video:empty()},paidAssetMetrics:Record<keyof typeof assetStyle,Metric>={Mixed:empty(),Message:empty(),Picture:empty(),Video:empty()};
  const assetRows:Array<Metric&{type:keyof typeof assetStyle;paid:boolean}>=[];
  google.forEach(test=>test.groups.forEach(row=>assetRows.push({...row,type:test.creativeType??"Message",paid:true})));
  meta.adGroups.flatMap(group=>group.activeAds).forEach(row=>{assetCounts[row.mediaType==="Image"?"Picture":"Video"]++;assetRows.push({...row,type:row.mediaType==="Image"?"Picture":"Video",paid:true});});
  reddit.campaigns.flatMap(campaign=>campaign.groups).flatMap(group=>group.activeAds).forEach(row=>{const type=row.contentType==="Image"?"Picture":row.contentType==="Video"?"Video":"Message";assetCounts[type]++;assetRows.push({...row,type,paid:true});});
  edm.tests.forEach(row=>assetRows.push({spend:0,revenue:row.revenue,orders:row.orders,clicks:row.clicks??0,type:"Message",paid:false}));
  assetRows.forEach(row=>{add(assetMetrics[row.type],row);if(row.paid)add(paidAssetMetrics[row.type],row);});
  const all=Object.values(channels).reduce((sum,row)=>(add(sum,row),sum),empty());
  const averageCvr=(()=>{const values=assetRows.filter(row=>row.clicks>0).map(row=>row.orders/row.clicks);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;})();
  const channelSegments=(metric:"revenue"|"orders",formatter:(value:number)=>string):Segment[]=>(Object.keys(channelStyle) as Array<keyof typeof channelStyle>).map(label=>({label,value:channels[label][metric],display:formatter(channels[label][metric]),...channelStyle[label]}));
  const channelRoas:Segment[]=(Object.keys(channelStyle) as Array<keyof typeof channelStyle>).map(label=>({label,value:channels[label].spend,display:showRatio(ratio(channels[label].revenue,channels[label].spend)),...channelStyle[label]}));
  const channelCvr:Segment[]=(Object.keys(channelStyle) as Array<keyof typeof channelStyle>).map(label=>({label,value:channels[label].clicks,display:channels[label].clicks?percent.format(channels[label].orders/channels[label].clicks):"—",...channelStyle[label]}));
  const assetRoas:Segment[]=(Object.keys(assetStyle) as Array<keyof typeof assetStyle>).map(label=>({label,value:paidAssetMetrics[label].spend,display:showRatio(ratio(paidAssetMetrics[label].revenue,paidAssetMetrics[label].spend)),...assetStyle[label]}));
  const assetCvr:Segment[]=(Object.keys(assetStyle) as Array<keyof typeof assetStyle>).map(label=>({label,value:assetMetrics[label].clicks,display:assetMetrics[label].clicks?percent.format(assetMetrics[label].orders/assetMetrics[label].clicks):"—",...assetStyle[label]}));
  const countSegments:Segment[]=(Object.keys(assetStyle) as Array<keyof typeof assetStyle>).map(label=>({label,value:assetCounts[label],display:number.format(assetCounts[label]),...assetStyle[label]}));
  return <section aria-labelledby="overview-metrics"><h2 id="overview-metrics" className="text-title-2-semibold text-text-primary">Business Performance</h2><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6"><MetricCard title="Total Number of Assets" value={number.format(Object.values(assetCounts).reduce((a,b)=>a+b,0))} className="xl:col-span-2" caption="Tested assets" segments={countSegments} /><MetricCard title="Total Revenue" value={currency.format(all.revenue)} className="xl:col-span-2" caption="Attributed revenue" segments={channelSegments("revenue",currency.format)} /><MetricCard title="Total Orders" value={number.format(all.orders)} className="xl:col-span-2" caption="Attributed orders" segments={channelSegments("orders",number.format)} /><MetricCard className="xl:col-span-2" title="Total Reach" value={totalReach==null?"—":number.format(totalReach)} caption="Reach" segments={reachSegments} preserveTotal ></MetricCard><MetricCard className="xl:col-span-2" title="Unique Reach" value={uniqueReach==null?"—":number.format(uniqueReach)} caption="Unique Reach" segments={uniqueSegments} preserveTotal /><MetricCard className="xl:col-span-2" title="CTR" value={overallCtr.ctr==null?"—":percent.format(overallCtr.ctr)} caption="Clicks / impressions and delivered" segments={ctrSegments} preserveTotal /><MetricCard className="xl:col-span-3" title="Total ROAS" showDistribution={false} value={showRatio(paid.roas)} preserveTotal caption="Paid conversion value / paid spend" segments={channelRoas} ><p className="mt-2 text-caption-1-regular text-text-secondary">{preciseCurrency.format(paid.revenue)} conversion value / {preciseCurrency.format(paid.spend)} spend · Google, Meta, Reddit</p><DetailRow title="BY ASSET TYPE" items={assetRoas}/></MetricCard><MetricCard className="xl:col-span-3" title="Total Conversion Rate" showDistribution={false} value={averageCvr==null?"—":percent.format(averageCvr)} caption="Average asset conversion rate" segments={channelCvr} ><DetailRow title="BY ASSET TYPE" items={assetCvr}/></MetricCard></div></section>;
}
