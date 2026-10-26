export type PaidOverviewMetric={spend:number;revenue:number;clicks:number;impressions:number|null};
export function aggregatePaidOverview(rows:PaidOverviewMetric[]){
 const total=rows.reduce((sum,row)=>({spend:sum.spend+row.spend,revenue:sum.revenue+row.revenue,clicks:sum.clicks+row.clicks,impressions:(sum.impressions??0)+(row.impressions??0)}),{spend:0,revenue:0,clicks:0,impressions:0});
 const impressions=rows.some(row=>row.impressions==null)?null:total.impressions;
 return {...total,impressions,roas:total.spend>0?total.revenue/total.spend:null,ctr:impressions!=null&&impressions>0?total.clicks/impressions:null};
}

export function aggregateOverviewCtr(paid:{clicks:number;impressions:number|null},edm:{uniqueClicks:number;delivered:number}){
 const clicks=paid.clicks+edm.uniqueClicks,exposures=paid.impressions==null?null:paid.impressions+edm.delivered;
 return {clicks,exposures,ctr:exposures!=null&&exposures>0?clicks/exposures:null};
}
