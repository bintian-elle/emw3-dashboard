import {trackingReportReader} from './website-tracking-reader.ts';
import {pageDefinition,pageFilter,pagePathIsPublic,type TrackingPageData,type TrackingPageScope} from './website-tracking-pages.ts';
import type {TrackingPeriod} from './website-tracking.ts';
export async function fetchTrackingPage(period:TrackingPeriod,device:string,scope:TrackingPageScope):Promise<TrackingPageData>{
 const {report,metadata}=await trackingReportReader(period,device),definition=pageDefinition(scope.page);
 const base=pageFilter(scope,device).andGroup.expressions;
 // The reader always includes fixed production host/device filters. These expressions add only the page scope.
 const pageExpressions=base.slice(device==='all'?1:2);
 const cartFilter={orGroup:{expressions:[{filter:{fieldName:'eventName',inListFilter:{values:['view_cart','checkout_click']}}},{filter:{fieldName:'customEvent:feature_source',inListFilter:{values:['cart_bundle_upgrade','cart_recommendations','promo_code']}}}]}};
 const scoped=[...pageExpressions,...scope.page==='cart'?[cartFilter]:[]];
 const events=await report(['eventName'],['eventCount','totalUsers'],undefined,period,scoped);
 const sources=scope.page==='cart'?['cart_bundle_upgrade','cart_recommendations','promo_code']:['cart_bundle_upgrade','cart_recommendations','pdp_addons','compare','promo_code'];
 const features=await report(['eventName','customEvent:feature_source','customEvent:feature_action','customEvent:feature_result'],['eventCount','totalUsers'],['view_item_list','select_item','cart_feature_action','cart_feature_result','promo_code_open','compare_view','compare_entry_view','compare_click'],period,[...scoped,{filter:{fieldName:'customEvent:feature_source',inListFilter:{values:sources}}}]);
 const denominator=scope.page==='cart'?'view_cart':'page_view';
 const dailyFilter=definition.primary==='select_item'?{orGroup:{expressions:[{filter:{fieldName:'eventName',stringFilter:{matchType:'EXACT',value:denominator}}},{andGroup:{expressions:[{filter:{fieldName:'eventName',stringFilter:{matchType:'EXACT',value:'select_item'}}},{filter:{fieldName:'customEvent:feature_source',inListFilter:{values:[...definition.sources]}}}]}}]}}:undefined;
 const daily=await report(['date','eventName'],['eventCount','totalUsers'],[denominator,definition.primary],period,[...scoped,...dailyFilter?[dailyFilter]:[]]);
 const broad=pageFilter({...scope,path:''},device).andGroup.expressions.slice(device==='all'?1:2);
 const paths=await report(['pagePath'],['screenPageViews'],['page_view'],period,broad);
 // Never retain account, order, checkout, query or other private path identifiers in snapshots.
 paths.rows=paths.rows.filter(row=>pagePathIsPublic(row.dimensions[0]));
 return {property:'451107071',fetchedAt:new Date().toISOString(),scope,events,features,daily,paths,timeZone:metadata.timeZone};
}
