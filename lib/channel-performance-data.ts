import {aggregatePaidOverview} from './overview-metrics.ts';

export type ChannelMetricRow={spend:number;revenue:number;orders:number;clicks:number;impressions:number|null};
export type ChannelPerformanceRow={key:string;name:string;href:string;anchors:string[];spend:number|null;revenue:number|null;orders:number|null;reach:number|null;ctr:number|null;roas:number|null;reachKind:'reach'|'delivered'|'social';views?:number|null;stale?:boolean};
type GoogleReport={campaignName:string;groups:readonly ChannelMetricRow[];reach?:number|null};
type MetaInput={campaigns:readonly {campaignName:string}[];totals:ChannelMetricRow&{reach:number|null}};
type RedditInput={campaigns:readonly {name:string;reach:number;groups:readonly {activeAds:readonly ChannelMetricRow[]}[]}[]};
type EdmInput={campaigns:readonly {campaignName:string}[];tests:readonly {hasData:boolean;revenue:number;orders:number;delivered:number;clicks:number|null}[]};
const root='/bluevua/testing';
/** The Overview defaults to last week; Reddit's own default is lifetime. */
export function channelPerformanceHref(path:string,query:string){
 const params=new URLSearchParams(query),period=params.get('period');
 const valid=['lastWeek','wtd','mtd','ytd','last7','last30','last90','custom'].includes(period??'')?period!:'lastWeek';
 const result=new URLSearchParams({period:valid});
 if(valid==='custom')for(const key of ['start','end']){const value=params.get(key);if(value)result.set(key,value);}
 return `${root}/${path}?${result}`;
}
const anchors=(channel:string,names:readonly string[])=>[...new Set(names)].map(name=>`campaign:${channel}:${name}`);
function sum(values:readonly number[]){return values.reduce((a,b)=>a+b,0);}
function paid(key:string,name:string,path:string,rows:readonly ChannelMetricRow[],reach:number|null,names:readonly string[],query:string):ChannelPerformanceRow{
 const result=aggregatePaidOverview([...rows]);const available=rows.length>0&&rows.every(row=>[row.spend,row.revenue,row.orders,row.clicks].every(Number.isFinite));
 return {key,name,href:channelPerformanceHref(path,query),anchors:anchors(key,names),spend:available?result.spend:null,revenue:available?result.revenue:null,orders:available?sum(rows.map(row=>row.orders)):null,reach,ctr:available&&key!=='google-pmax'?result.ctr:null,roas:available?result.roas:null,reachKind:'reach'};
}
/** Uses the same selected test rows and derived ratios as Business Performance. */
export function buildChannelPerformance({search,pmax,demandGen,meta,reddit,edm,query}:{search:readonly GoogleReport[];pmax:readonly GoogleReport[];demandGen:readonly GoogleReport[];meta:MetaInput;reddit:RedditInput;edm:EdmInput;query:string}):ChannelPerformanceRow[]{
 const google=(key:string,name:string,path:string,reports:readonly GoogleReport[])=>paid(key,name,path,reports.flatMap(report=>report.groups),reports.length&&reports.every(report=>report.reach!=null&&Number.isFinite(report.reach))?sum(reports.map(report=>report.reach!)):null,reports.map(report=>report.campaignName),query);
 const redditRows=reddit.campaigns.flatMap(campaign=>campaign.groups.flatMap(group=>group.activeAds));
 const redditReach=reddit.campaigns.length&&reddit.campaigns.every(campaign=>Number.isFinite(campaign.reach))?sum(reddit.campaigns.map(campaign=>campaign.reach)):null;
 const tests=edm.tests.filter(test=>test.hasData),delivered=tests.length?sum(tests.map(test=>test.delivered)):null;
 const clicks=tests.length&&tests.every(test=>test.clicks!=null&&Number.isFinite(test.clicks))?sum(tests.map(test=>test.clicks!)):null;
 const email:ChannelPerformanceRow={key:'edm',name:'EDM',href:channelPerformanceHref('edm',query),anchors:anchors('edm',edm.campaigns.map(campaign=>campaign.campaignName)),spend:null,revenue:tests.length?sum(tests.map(test=>test.revenue)):null,orders:tests.length?sum(tests.map(test=>test.orders)):null,reach:delivered,ctr:clicks!=null&&delivered!=null&&delivered>0?clicks/delivered:null,roas:null,reachKind:'delivered'};
 return [google('google-search','Google Search','google/search',search),google('google-pmax','Google PMAX','google/pmax',pmax),google('google-demand-gen','Google Demand Gen','google/demand-gen',demandGen),paid('meta','Meta','meta',meta.campaigns.length?[meta.totals]:[],meta.totals.reach,meta.campaigns.map(campaign=>campaign.campaignName),query),paid('reddit','Reddit','reddit',redditRows,redditReach,reddit.campaigns.map(campaign=>campaign.name),query),email];
}
export function socialChannelPerformance(posts:readonly {metrics:{views:number|null;reach:number|null}}[],stale:boolean):ChannelPerformanceRow{
 const total=(key:'views'|'reach')=>posts.length&&posts.every(post=>post.metrics[key]!=null&&Number.isFinite(post.metrics[key]))?sum(posts.map(post=>post.metrics[key]!)):null;
 return {key:'social',name:'Social Media',href:`${root}/social`,anchors:[],spend:null,revenue:null,orders:null,reach:total('reach'),views:total('views'),ctr:null,roas:null,reachKind:'social',stale};
}
