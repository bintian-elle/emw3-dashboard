import type {TrackingReport} from './website-tracking.ts';
export type FeatureId='cart_bundle_upgrade'|'cart_recommendations'|'pdp_addons'|'compare'|'promo_code';
export type TrackingPage='collection'|'compare'|'pdp'|'cart';
export type FeatureTrackingReports={events:TrackingReport;operations:TrackingReport;items:TrackingReport;coupons:TrackingReport;entryPoints:TrackingReport;collectionEntries:TrackingReport;pdpVisitors:TrackingReport};
export const featureDefinitions:Array<{id:FeatureId;name:string;nodes:number;page:TrackingPage}>=[
 {id:'cart_bundle_upgrade',name:'Switch to Bundle',nodes:7,page:'cart'},
 {id:'cart_recommendations',name:'You May Also Like',nodes:7,page:'cart'},
 {id:'pdp_addons',name:'PDP Add-ons',nodes:7,page:'pdp'},
 {id:'compare',name:'Collection Compare',nodes:10,page:'compare'},
 {id:'promo_code',name:'Promo Code',nodes:6,page:'cart'},
];
export type InventoryCheck={id:string;node:string;feature:FeatureId;page:TrackingPage;label:string;event:string;kind:'event'|'operation'|'items'|'coupon';action?:string;result?:string;itemMetric?:number;note?:string};
function productChecks(feature:FeatureId,page:TrackingPage):InventoryCheck[]{
 const action=feature==='cart_bundle_upgrade'?'upgrade':'add';
 const rows:Array<Omit<InventoryCheck,'id'|'node'|'feature'|'page'>&{key:string;nodeKey?:string}>=[
  {key:'exposure',label:'Product card exposure',event:'view_item_list',kind:'event',note:'At least 50% visible for one continuous second.'},
  {key:'product-click',label:'Product details clicked',event:'select_item',kind:'event'},
  {key:'submit',label:action==='upgrade'?'Bundle upgrade submitted':'Add to cart submitted',event:'cart_feature_action',kind:'operation',action},
  ...(['success','error','unverified'] as const).map(result=>({key:result,nodeKey:'result',label:`${action==='upgrade'?'Upgrade':'Add to cart'} result: ${result==='error'?'error':result==='unverified'?'unverified':'success'}`,event:'cart_feature_result',kind:'operation' as const,action,result})),
  {key:'confirmed-add',label:'Confirmed items added to cart',event:'add_to_cart',kind:'items',itemMetric:2,note:'Product units, not operation events or visitors.'},
  {key:'checkout',label:'Source-attributed items checked out',event:'begin_checkout',kind:'items',itemMetric:3,note:'Item-list source attribution; not a matched user funnel.'},
  {key:'purchase',label:'Source-attributed items purchased',event:'purchase',kind:'items',itemMetric:4,note:'Actual GA4 item quantity and item revenue attributed to this source.'},
 ];
 return rows.map(({key,nodeKey,...row})=>({...row,id:`${feature}-${key}`,node:`${feature}-${nodeKey??key}`,feature,page}));
}
const compareEntryChecks:InventoryCheck[]=[
 {id:'compare-entry-exposure',node:'compare-entry-exposure',feature:'compare',page:'collection',label:'Compare entry exposure',event:'compare_entry_view',kind:'event',note:'Collection image-card exposure; not all Collection page views.'},
 {id:'compare-entry-click',node:'compare-entry-click',feature:'compare',page:'collection',label:'Compare entry clicked',event:'compare_click',kind:'event',note:'Compare clicks recorded on Collection pages, across localized Collection paths.'},
 {id:'compare-page-view',node:'compare-page-view',feature:'compare',page:'compare',label:'Compare page entered',event:'compare_view',kind:'event',note:'One entry per page navigation; changing a model is not another page entry.'},
];
const promoChecks:InventoryCheck[]=[{id:'promo_code-open',node:'promo_code-open',feature:'promo_code',page:'cart',label:'Promo section opened',event:'promo_code_open',kind:'event'},
 ...(['apply','remove'] as const).flatMap(action=>[
  {id:`promo_code-${action}-submit`,node:`promo_code-${action}-submit`,feature:'promo_code' as const,page:'cart' as const,label:action==='apply'?'Code application submitted':'Code removal submitted',event:'cart_feature_action',kind:'operation' as const,action},
  ...(action==='apply'?['success','not_applicable','error','unverified']:['success','error','unverified']).map(result=>({id:`promo_code-${action}-${result}`,node:`promo_code-${action}-result`,feature:'promo_code' as const,page:'cart' as const,label:`${action==='apply'?'Apply':'Remove'} result: ${result.replaceAll('_',' ')}`,event:'cart_feature_result',kind:'operation' as const,action,result})),
 ]),
 {id:'promo_code-purchase',node:'promo_code-purchase',feature:'promo_code',page:'cart',label:'Purchases with a coupon (site-wide)',event:'purchase',kind:'coupon',note:'Order coupon is site-wide purchase context. It does not prove use of this promo input; includes automatic/applied checkout codes.'},
];
export const featureInventory:InventoryCheck[]=[...productChecks('cart_bundle_upgrade','cart'),...productChecks('cart_recommendations','cart'),...productChecks('pdp_addons','pdp'),...compareEntryChecks,...productChecks('compare','compare'),...promoChecks];
export type InventoryMeasurement={events:number|null;users:number|null;quantity:number|null;revenue:number|null;status:'recorded'|'empty'|'unavailable'};
const unavailable=():InventoryMeasurement=>({events:null,users:null,quantity:null,revenue:null,status:'unavailable'});
export function usableReport(report:TrackingReport|undefined):report is TrackingReport{return !!report&&!report.error&&!report.warnings.some(w=>/partial|sampled|hide some|\(other\)/i.test(w));}
export function inventoryMeasurement(check:InventoryCheck,data:FeatureTrackingReports|undefined):InventoryMeasurement{
 if(!data)return unavailable();
 const collectionEntry=check.page==='collection';
 const report=collectionEntry?data.collectionEntries:data[check.kind==='event'?'events':check.kind==='operation'?'operations':check.kind==='items'?'items':'coupons'];
 if(!usableReport(report))return unavailable();
 let events:number|null=null,users:number|null=null,quantity:number|null=null,revenue:number|null=null;
 if(check.kind==='event'||check.kind==='operation'){
  const matching=report.rows.filter(row=>row.dimensions[0]===check.event&&(collectionEntry||row.dimensions[1]===check.feature)&&(check.kind!=='operation'||(row.dimensions[2]===check.action&&(!check.result||row.dimensions[3]===check.result))));
  // Queries deliberately omit entry point here, so there is one exact row per tuple.
  // Unexpected duplicated tuples are not safe to aggregate into distinct users.
  if(matching.length>1)return unavailable();
  events=matching[0]?.metrics[0]??0;users=matching[0]?.metrics[1]??0;
 }else if(check.kind==='items'){
  const matching=report.rows.filter(row=>row.dimensions[0]===check.feature);if(matching.length>1)return unavailable();
  quantity=matching[0]?.metrics[check.itemMetric!]??0;
  if(check.itemMetric===4)revenue=matching[0]?.metrics[5]??0;
 }else{
  const matching=report.rows.filter(row=>row.dimensions[0]&&!['(not set)','(none)'].includes(row.dimensions[0]));
  events=matching.reduce((sum,row)=>sum+(row.metrics[0]??0),0);revenue=matching.reduce((sum,row)=>sum+(row.metrics[2]??0),0);
  users=matching.length===1?(matching[0].metrics[1]??0):matching.length===0?0:null;
 }
 return {events,users,quantity,revenue,status:[events,quantity,revenue].some(value=>value!==null&&value!==0)?'recorded':'empty'};
}
