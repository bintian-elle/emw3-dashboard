export type GoogleAdDaily={groupId:string;adId:string;date:string;spend:number;revenue:number;orders:number;impressions:number;clicks:number};
export type GoogleAdMetrics=Pick<GoogleAdDaily,"spend"|"revenue"|"orders"|"impressions"|"clicks">&{cpa:number|null;cvr:number|null;roas:number|null;ctr:number|null;cpc:number|null};
export type GoogleAdPerformanceArchive={version:number;range:{start:string;end:string};days:GoogleAdDaily[]};
export function aggregateGoogleAdPerformance(archive:GoogleAdPerformanceArchive,groupId:string,period:{start:string;end:string}):Record<string,GoogleAdMetrics>{
 const totals:Record<string,GoogleAdMetrics>={};
 for(const row of archive.days){if(row.groupId!==groupId||row.date<period.start||row.date>period.end)continue;
 const sum=totals[row.adId]??{spend:0,revenue:0,orders:0,impressions:0,clicks:0,cpa:null,cvr:null,roas:null,ctr:null,cpc:null};
 sum.spend+=row.spend;sum.revenue+=row.revenue;sum.orders+=row.orders;sum.impressions+=row.impressions;sum.clicks+=row.clicks;totals[row.adId]=sum;
 }
 const ratio=(a:number,b:number)=>b>0?a/b:null;
 for(const sum of Object.values(totals)){sum.cpa=ratio(sum.spend,sum.orders);sum.cvr=ratio(sum.orders,sum.clicks);sum.roas=ratio(sum.revenue,sum.spend);sum.ctr=ratio(sum.clicks,sum.impressions);sum.cpc=ratio(sum.spend,sum.clicks);}
 return totals;
}
export const emptyGoogleAdMetrics:GoogleAdMetrics={spend:0,revenue:0,orders:0,impressions:0,clicks:0,cpa:null,cvr:null,roas:null,ctr:null,cpc:null};
