export type PaidOverviewMetric={spend:number;revenue:number;clicks:number;impressions:number};
export function aggregatePaidOverview(rows:PaidOverviewMetric[]){
 const total=rows.reduce((sum,row)=>({spend:sum.spend+row.spend,revenue:sum.revenue+row.revenue,clicks:sum.clicks+row.clicks,impressions:sum.impressions+row.impressions}),{spend:0,revenue:0,clicks:0,impressions:0});
 return {...total,roas:total.spend>0?total.revenue/total.spend:null,ctr:total.impressions>0?total.clicks/total.impressions:null};
}

export function aggregateOverviewCtr(paid:{clicks:number;impressions:number},edm:{uniqueClicks:number;delivered:number}){
 const clicks=paid.clicks+edm.uniqueClicks,exposures=paid.impressions+edm.delivered;
 return {clicks,exposures,ctr:exposures>0?clicks/exposures:null};
}
