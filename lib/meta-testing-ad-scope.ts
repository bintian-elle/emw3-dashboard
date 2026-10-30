import type {MetaCreative} from './meta-creative-type.ts';
export const META_TESTING_BASIS='meta-testing-period-ads-v2';
type InventoryAd={id:string;name:string;adset_id:string;configured_status?:string;effective_status?:string;creative?:MetaCreative&{body?:string;title?:string}};
type PeriodAd={ad_id?:string;ad_name?:string;adset_id:string;spend?:string};
/** Input inventory belongs to the configured testing campaign. Current delivery
 * status never removes its selected-period performance or creative identity. */
export function metaTestingAdInventory(ads:InventoryAd[],insights:PeriodAd[]):InventoryAd[]{
 const inventory=new Map(ads.map(ad=>[ad.id,ad]));
 for(const row of insights)if(row.ad_id&&!inventory.has(row.ad_id))inventory.set(row.ad_id,{id:row.ad_id,name:row.ad_name||`Ad ${row.ad_id}`,adset_id:row.adset_id,configured_status:'UNKNOWN',effective_status:'UNKNOWN'});
 return [...inventory.values()];
}
