export type ReadoutDailyRow={date:string;spend:number;revenue:number;orders:number;impressions:number|null;clicks:number;adId?:string;entityId?:string;name?:string;linkClicks?:number};
export function readoutTotals(rows:Array<{spend:number;revenue:number;orders:number;impressions:number|null;clicks:number}>){
 const total=rows.reduce((a,b)=>({spend:a.spend+b.spend,revenue:a.revenue+b.revenue,orders:a.orders+b.orders,impressions:(a.impressions??0)+(b.impressions??0),clicks:a.clicks+b.clicks}),{spend:0,revenue:0,orders:0,impressions:0,clicks:0});
 const ratio=(a:number,b:number)=>b>0?a/b:null;
 const impressions=rows.some(row=>row.impressions==null)?null:total.impressions;
 return {...total,impressions,roas:ratio(total.revenue,total.spend),cpa:ratio(total.spend,total.orders),ctr:impressions===null?null:ratio(total.clicks,impressions),cvr:ratio(total.orders,total.clicks),cpc:ratio(total.spend,total.clicks)};
}
export function deliveryWindow(rows:ReadoutDailyRow[],period:{start:string;end:string}){
 const positive=rows.filter(r=>r.spend>0||(r.impressions??0)>0||r.clicks>0).sort((a,b)=>a.date.localeCompare(b.date));
 const within=positive.filter(r=>r.date>=period.start&&r.date<=period.end);
 return {first_observed_delivery:positive[0]?.date??null,last_observed_delivery:positive.at(-1)?.date??null,active_days_in_period:new Set(within.map(r=>r.date)).size,effective_start:within[0]?.date??null,effective_end:within.at(-1)?.date??null,launch_basis:'first observed positive delivery in available testing-entity history; not campaign name or creation date'};
}

export function overviewReadoutReference(input:{channels:Record<string,Array<{spend:number;revenue:number;orders:number;impressions:number|null;clicks:number}>>;reachComponents:Record<string,number|null>;edm?:{revenue:number;orders:number;uniqueClicks:number|null;delivered:number}}){
 const channels=Object.fromEntries(Object.entries(input.channels).map(([channel,rows])=>[channel,readoutTotals(rows)]));
 const paid=readoutTotals(Object.values(input.channels).flat());
 const knownReach=Object.values(input.reachComponents).filter((value):value is number=>value!=null);
 return {scope:"Business Performance cards: configured Google testing rows, Meta testing campaign totals and configured Reddit testing ads in the selected ad groups. EDM contributes revenue, purchases, Delivered reach and unique clicks to overall CTR; it is excluded from paid ROAS. Social is excluded.",channels,paid,display:{spend:paid.spend,revenue:paid.revenue+(input.edm?.revenue??0),orders:paid.orders+(input.edm?.orders??0),roas:paid.roas,ctr:paid.impressions===null||input.edm?.uniqueClicks===null?null:((paid.impressions??0)+(input.edm?.delivered??0)>0?(paid.clicks+(input.edm?.uniqueClicks??0))/((paid.impressions??0)+(input.edm?.delivered??0)):null)},edm:input.edm??null,totalReach:knownReach.length?knownReach.reduce((sum,value)=>sum+value,0):null,reachComponents:input.reachComponents,missingReachComponents:Object.entries(input.reachComponents).filter(([,value])=>value==null).map(([key])=>key)};
}
