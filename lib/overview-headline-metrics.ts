import {aggregatePaidOverview} from './overview-metrics.ts';

type Row={spend:number;revenue:number;orders:number;impressions:number|null;clicks:number};
export type OverviewHeadlineInput={
 google:readonly {channel?:"search"|"pmax"|"demand-gen";groups:readonly Row[];reach?:number|null}[];
 meta:{totals:Row&{reach:number|null}};
 reddit:{campaigns:readonly {reach:number;groups:readonly {activeAds:readonly Row[]}[]}[]};
 edm:{tests:readonly {revenue:number;orders:number;delivered:number;clicks?:number|null}[];uniqueRecipients?:number|null};
};
export type OverviewHeadlineMetrics={spend:number;revenue:number;orders:number;totalReach:number|null;roas:number|null;ctr:number|null};

/** One selected-period object supplies both the live summary and Business Performance cards. */
export function overviewHeadlineMetrics({google,meta,reddit,edm}:OverviewHeadlineInput):OverviewHeadlineMetrics{
 const paidRows=[...google.flatMap(test=>test.groups),meta.totals,...reddit.campaigns.flatMap(campaign=>campaign.groups.flatMap(group=>group.activeAds))];
 const paid=aggregatePaidOverview(paidRows);
 const googleReach=google.map(test=>test.reach).filter((value):value is number=>value!=null);
 const redditReach=reddit.campaigns.length&&reddit.campaigns.every(campaign=>Number.isFinite(campaign.reach))?reddit.campaigns.reduce((sum,campaign)=>sum+campaign.reach,0):null;
 const delivered=edm.tests.reduce((sum,test)=>sum+test.delivered,0);
 const knownReach=[googleReach.length?googleReach.reduce((sum,value)=>sum+value,0):null,meta.totals.reach,redditReach,delivered].filter((value):value is number=>value!=null);
 const ctrRows=[...google.filter(test=>test.channel!=="pmax").flatMap(test=>test.groups),meta.totals,...reddit.campaigns.flatMap(campaign=>campaign.groups.flatMap(group=>group.activeAds))];
 const ctr=aggregatePaidOverview(ctrRows).ctr;
 return {spend:paid.spend,revenue:paid.revenue+edm.tests.reduce((sum,test)=>sum+test.revenue,0),
  orders:paidRows.reduce((sum,row)=>sum+row.orders,0)+edm.tests.reduce((sum,test)=>sum+test.orders,0),
  totalReach:knownReach.length?knownReach.reduce((sum,value)=>sum+value,0):null,roas:paid.roas,
  ctr};
}

const currency=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const preciseCurrency=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2});
const number=new Intl.NumberFormat('en-US',{maximumFractionDigits:0});
const percent=new Intl.NumberFormat('en-US',{style:'percent',minimumFractionDigits:2,maximumFractionDigits:2});
export function formatOverviewHeadlineMetrics(metrics:OverviewHeadlineMetrics){
 return {spend:preciseCurrency.format(metrics.spend),revenue:currency.format(metrics.revenue),orders:number.format(metrics.orders),
  totalReach:metrics.totalReach==null?'—':number.format(metrics.totalReach),roas:metrics.roas==null?'—':metrics.roas.toFixed(2),
  ctr:metrics.ctr==null?'—':percent.format(metrics.ctr)};
}
