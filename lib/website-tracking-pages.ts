import {trackingFilter,type TrackingPeriod,type TrackingReport} from './website-tracking.ts';
import {visitorRate} from './website-tracking-metrics.ts';
export const trackingEventDefinitions=[
 ['page_view','Page views'],['first_visit','First-time visitors'],['session_start','Session starts'],['user_engagement','Engaged visitors'],
 ['scroll','Reached 90% page depth'],['click','Outbound link clicks'],['file_download','Download link clicks'],['view_search_results','Search results viewed'],
 ['form_start','Form started'],['form_submit','Form submitted'],['video_start','Video started'],['video_progress','Video progress'],['video_complete','Video completed'],
 ['view_item','Product viewed'],['view_item_list','Feature product card exposure'],['select_item','Feature product details clicked'],['add_to_cart','Add-to-cart events'],
 ['view_cart','Cart opened'],['checkout_click','Checkout button clicked'],['begin_checkout','Checkout started'],['purchase','GA4 purchase recorded'],
 ['cart_feature_action','Feature action submitted'],['cart_feature_result','Feature action result'],['compare_entry_view','Compare entry seen'],['compare_click','Compare entry clicked'],['compare_view','Compare page entered'],['promo_code_open','Promo code section opened'],
].map(([event,label])=>({event,label}));
export const eventLabel=(event:string)=>trackingEventDefinitions.find(item=>item.event===event)?.label??event;
const prefix='^/(?:[a-z]{2}(?:-[a-z]{2})?/)?';
export const trackingPages=[
 {id:'collection',label:'Collection pages',pattern:prefix+'collections(?:/|$)',primary:'compare_click',primaryLabel:'Clicked Compare',sources:[] as string[]},
 {id:'home',label:'Homepage',pattern:'^/(?:[a-z]{2}(?:-[a-z]{2})?/?)?$',primary:'view_cart',primaryLabel:'Opened cart',sources:[] as string[]},
 {id:'pdp',label:'Product pages',pattern:prefix+'products(?:/|$)',primary:'select_item',primaryLabel:'Clicked PDP Add-ons',sources:['pdp_addons']},
 {id:'compare',label:'Compare page',pattern:prefix+'products/compare(?:/|$)',primary:'select_item',primaryLabel:'Clicked product details',sources:['compare']},
 {id:'search',label:'Search pages',pattern:prefix+'search(?:/|$)',primary:'view_search_results',primaryLabel:'Viewed search results',sources:[] as string[]},
 {id:'content',label:'Landing & content pages',pattern:prefix+'pages(?:/|$)',primary:'file_download',primaryLabel:'Clicked a download',sources:[] as string[]},
 {id:'blog',label:'Blog pages',pattern:prefix+'blogs(?:/|$)',primary:'scroll',primaryLabel:'Reached page bottom',sources:[] as string[]},
 {id:'account',label:'Account pages',pattern:prefix+'account(?:/|$)',primary:'form_start',primaryLabel:'Started a form',sources:[] as string[]},
 {id:'policy',label:'Policy pages',pattern:prefix+'policies(?:/|$)',primary:'scroll',primaryLabel:'Reached page bottom',sources:[] as string[]},
 {id:'other',label:'Other pages',pattern:'',primary:'scroll',primaryLabel:'Reached page bottom',sources:[] as string[]},
 {id:'cart',label:'Cart drawer',pattern:'',primary:'checkout_click',primaryLabel:'Clicked Checkout',sources:['cart_bundle_upgrade','cart_recommendations','promo_code']},
 {id:'checkout',label:'Checkout & orders',pattern:prefix+'(?:checkouts?|orders?)(?:/|$)',primary:'form_start',primaryLabel:'Started a form',sources:[] as string[]},
] as const;
export type TrackingPageId=typeof trackingPages[number]['id'];
export type TrackingPageScope={page:TrackingPageId;path:string};
export type TrackingPageData={property:string;fetchedAt:string;scope:TrackingPageScope;events:TrackingReport;features:TrackingReport;daily:TrackingReport;paths:TrackingReport;timeZone?:string};
export const pageDefinition=(page:TrackingPageId)=>trackingPages.find(item=>item.id===page)!;
export function pagePathIsPublic(path:string){
 if(!path.startsWith('/')||path.startsWith('//')||path.length>300||/[?\x00-\x20\\#]/.test(path)||/%(?:2e|2f|5c|3f|23|0[0-9a-f]|1[0-9a-f])/i.test(path)||path.includes('..'))return false;
 const local=path.replace(/^\/[a-z]{2}(?:-[a-z]{2})?(?=\/|$)/i,'')||'/';
 if(local==='/')return true;
 if(/^\/account(?:\/|$)/.test(local))return ['/account','/account/','/account/login','/account/signup'].includes(local);
 return /^\/(?:products|collections|pages|blogs|search|policies)(?:\/[\p{L}\p{N}_%+.,~-]+)*\/?$/u.test(local);
}
export function trackingPageScope(page='collection',path=''):TrackingPageScope{
 if(!trackingPages.some(item=>item.id===page))throw Error('Choose a supported page type.');
 const scope={page:page as TrackingPageId,path};
 if(path){
  if(!pagePathIsPublic(path))throw Error('Choose a public page URL from the list.');
  const item=pageDefinition(scope.page);
  if(scope.page==='checkout'||(item.pattern&&!new RegExp(item.pattern).test(path))||(scope.page==='pdp'&&new RegExp(pageDefinition('compare').pattern).test(path)))throw Error('The selected URL does not match this page type.');
  if(scope.page==='other')throw Error('Use the aggregate view for other pages.');
 }
 return scope;
}
const pathExpression=(value:string)=>({filter:{fieldName:'pagePath',stringFilter:{matchType:'PARTIAL_REGEXP',value}}});
export function pageFilter(scope:TrackingPageScope,device:string,includePath=true){
 trackingPageScope(scope.page,scope.path);
 const expressions:unknown[]=[...trackingFilter(device).andGroup.expressions];
 if(scope.page==='other')expressions.push({notExpression:{orGroup:{expressions:[...trackingPages.filter(p=>p.pattern).map(p=>pathExpression(p.pattern)),pathExpression(prefix+'cart(?:/|$)')]}}});
 else if(scope.page!=='cart')expressions.push(pathExpression(pageDefinition(scope.page).pattern));
 if(scope.page==='pdp')expressions.push({notExpression:pathExpression(pageDefinition('compare').pattern)});
 if(includePath&&scope.path)expressions.push({filter:{fieldName:'pagePath',stringFilter:{matchType:'EXACT',value:scope.path}}});
 return {andGroup:{expressions}};
}
export const usablePageReport=(report:TrackingReport|undefined):boolean=>!!report&&!report.error&&!report.warnings.some(w=>/partial|sampled|hide some|\(other\)/i.test(w));
export function pageEventValue(report:TrackingReport|undefined,event:string){
 if(!report||!usablePageReport(report))return {events:null,users:null};
 const rows=report.rows.filter(row=>row.dimensions[0]===event);if(rows.length>1)return {events:null,users:null};
 return {events:rows[0]?.metrics[0]??0,users:rows[0]?.metrics[1]??0};
}
export function pageFeatureValue(report:TrackingReport|undefined,source:string,event:string,action?:string,result?:string){
 if(!report||!usablePageReport(report))return {events:null,users:null};
 const rows=report.rows.filter(row=>row.dimensions[0]===event&&row.dimensions[1]===source&&(!action||row.dimensions[2]===action)&&(!result||row.dimensions[3]===result));
 if(rows.length>1)return {events:null,users:null};
 return {events:rows[0]?.metrics[0]??0,users:rows[0]?.metrics[1]??0};
}
export const pageVisitorRate=visitorRate;
export function pageDailySeries(report:TrackingReport|undefined,period:TrackingPeriod,denominator:string,numerator:string){
 if(!report||!usablePageReport(report))return null;
 const dates:string[]=[],visitors:number[]=[],actions:number[]=[],rate:Array<number|null>=[];
 for(let date=Date.parse(period.start+'T12:00:00Z');date<=Date.parse(period.end+'T12:00:00Z');date+=86400000){
  const iso=new Date(date).toISOString().slice(0,10),key=iso.replaceAll('-','');dates.push(iso);
  const v=report.rows.find(row=>row.dimensions[0]===key&&row.dimensions[1]===denominator)?.metrics[1]??0;
  const n=report.rows.find(row=>row.dimensions[0]===key&&row.dimensions[1]===numerator)?.metrics[1]??0;
  visitors.push(v);actions.push(n);rate.push(visitorRate(n,v));
 }
 return {dates,visitors,actions,rate};
}
export function trackingPageHref(period:TrackingPeriod,device:string,scope:TrackingPageScope){return `/bluevua/tracking?${new URLSearchParams({...period,device,page:scope.page,...scope.path?{path:scope.path}:{}})}`;}

export function pageEventNames(report:TrackingReport|undefined,cart=false){
 const expected=cart?['view_cart','checkout_click','promo_code_open','view_item_list','select_item','cart_feature_action','cart_feature_result']:trackingEventDefinitions.map(item=>item.event);
 return Array.from(new Set([...expected,...(report?.rows.map(row=>row.dimensions[0])??[])]));
}
