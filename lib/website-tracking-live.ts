import {trackingReportReader} from './website-tracking-reader.ts';
import {trackingOverviewRequests,type TrackingPeriod,type TrackingData} from './website-tracking.ts';
export async function fetchWebsiteTracking(period:TrackingPeriod,device:string):Promise<TrackingData>{
 const {report,metadata}=await trackingReportReader(period,device),requests=trackingOverviewRequests(device);
 // Keep the shared GA4 CLI sequential. Page reports have independent, smaller snapshots.
 const overview=await report(requests.overall.dimensions,requests.overall.metrics);
 const devices=requests.devices?await report(requests.devices.dimensions,requests.devices.metrics):undefined;
 const events=await report(['eventName'],['eventCount','totalUsers']);
 const actions=await report(['eventName','customEvent:feature_source','customEvent:feature_action','customEvent:feature_result','customEvent:entry_point'],['eventCount','totalUsers'],['cart_feature_action','cart_feature_result']);
 const lists=await report(['itemListId','itemName'],['itemsViewedInList','itemsClickedInList','itemsAddedToCart']);
 const purchases=await report(['itemListId','itemName'],['itemsPurchased','itemRevenue']);
 const items=await report(['itemListId'],['itemsViewedInList','itemsClickedInList','itemsAddedToCart','itemsCheckedOut','itemsPurchased','itemRevenue']);
 const coupons=await report(['orderCoupon'],['ecommercePurchases','totalUsers','purchaseRevenue'],['purchase']);
 return {overview,devices,events,actions,lists,purchases,features:{items,coupons},timeZone:metadata.timeZone,currency:metadata.currency,fetchedAt:new Date().toISOString(),property:'451107071'};
}
