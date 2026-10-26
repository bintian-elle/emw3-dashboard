import type {GoogleAdMetrics} from './google-ad-performance';

export const PMAX_TESTING_BASIS = 'pmax-testing-assets-v1';
export type PmaxDailyRow = {
 campaign:{id:string};assetGroup?:{id:string};asset?:{id:string};assetGroupAsset?:{fieldType:string;status?:string};segments:{date:string};
 metrics:{costMicros?:string;conversionsValue?:number;conversions?:number;impressions?:string|null;clicks?:string};
};
const fields=['spend','revenue','orders','clicks'] as const;
export function pmaxMetrics(rows:PmaxDailyRow[]):GoogleAdMetrics {
 const total=rows.reduce((a,r)=>({spend:a.spend+Number(r.metrics.costMicros??0)/1e6,revenue:a.revenue+Number(r.metrics.conversionsValue??0),orders:a.orders+Number(r.metrics.conversions??0),impressions:a.impressions+Number(r.metrics.impressions??0),clicks:a.clicks+Number(r.metrics.clicks??0)}),{spend:0,revenue:0,orders:0,impressions:0,clicks:0});
 const ratio=(a:number,b:number)=>b>0?a/b:null;
 const impressions=rows.some(row=>row.metrics.impressions===null)?null:total.impressions;
 return {...total,impressions,cpa:ratio(total.spend,total.orders),cvr:ratio(total.orders,total.clicks),roas:ratio(total.revenue,total.spend),ctr:impressions===null?null:ratio(total.clicks,impressions),cpc:ratio(total.spend,total.clicks)};
}
/** Subtract product-tree roots once; product impressions are not ad impressions. */
export function pmaxTestingDays(groupDays:PmaxDailyRow[],productDays:PmaxDailyRow[]):PmaxDailyRow[]{
 const key=(r:PmaxDailyRow)=>`${r.campaign.id}:${r.assetGroup?.id}:${r.segments.date}`;
 const products=new Map<string,PmaxDailyRow[]>();for(const row of productDays){const k=key(row);products.set(k,[...(products.get(k)??[]),row]);}
 const groups=new Map<string,PmaxDailyRow[]>();for(const row of groupDays){const k=key(row);groups.set(k,[...(groups.get(k)??[]),row]);}
 for(const [k,rows] of products)if(!groups.has(k)&&fields.some(f=>pmaxMetrics(rows)[f]>0))throw Error('PMax testing data cannot be reconciled for the selected dates.');
 return [...groups.entries()].map(([k,rows])=>{
  const group=pmaxMetrics(rows),product=pmaxMetrics(products.get(k)??[]),net={} as Record<typeof fields[number],number>;
  for(const f of fields){const difference=group[f]-product[f];if(difference < -0.000001)throw Error(`PMax testing ${f} cannot be reconciled for ${rows[0].segments.date}.`);net[f]=Math.abs(difference)<0.000001?0:difference;}
  return {...rows[0],metrics:{costMicros:String(Math.round(net.spend*1e6)),conversionsValue:net.revenue,conversions:net.orders,impressions:product.impressions&&product.impressions>0?null:String(group.impressions??0),clicks:String(net.clicks)}};
 });
}
export function currentPmaxReadout(payload:unknown,channel?:string):boolean{
 if(!['google-pmax','overview'].includes(channel??''))return true;
 return (payload as {metric_basis?:{pmax?:string}}|undefined)?.metric_basis?.pmax===PMAX_TESTING_BASIS;
}
export async function fetchPmaxAssetPerformance<T extends PmaxDailyRow>(search:<R>(query:string)=>Promise<R[]>,ids:string[],end:string){
 if(!ids.length)return {productDays:[] as T[],assetDays:[] as T[]};
 if(ids.some(id=>!/^\d+$/.test(id)))throw Error('Invalid PMax asset group scope.');
 const where=`asset_group.id IN (${ids.join(',')}) AND segments.date BETWEEN '2025-01-01' AND '${end}'`;
 const metrics='segments.date,metrics.cost_micros,metrics.conversions_value,metrics.conversions,metrics.impressions,metrics.clicks';
 const [productDays,assetDays]=await Promise.all([
  search<T>(`SELECT campaign.id,asset_group.id,asset_group_listing_group_filter.id,${metrics} FROM asset_group_product_group_view WHERE ${where} AND asset_group_listing_group_filter.parent_listing_group_filter IS NULL`),
  search<T>(`SELECT campaign.id,asset_group.id,asset.id,asset_group_asset.field_type,asset_group_asset.status,${metrics} FROM asset_group_asset WHERE ${where}`),
 ]);
 return {productDays,assetDays};
}
