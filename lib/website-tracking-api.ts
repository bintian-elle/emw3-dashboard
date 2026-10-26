import 'server-only';
import {after} from 'next/server';
import {readTrackingCache,refreshTrackingCache} from '@/lib/website-tracking-cache';
import {fetchWebsiteTracking} from '@/lib/website-tracking-live';
import type {TrackingPeriod} from '@/lib/website-tracking';
export type {TrackingData} from '@/lib/website-tracking';

/** Rendering reads private snapshots only; all GA4 work runs after the response. */
export async function getWebsiteTracking(period:TrackingPeriod,device:string){
 const state=await readTrackingCache(period,device);
 if(state.needsRefresh){
  after(async()=>{try{await refreshTrackingCache(period,device,()=>fetchWebsiteTracking(period,device));}catch{console.error('Website tracking background cache update failed.');}});
 }
 return {...state,refreshing:state.refreshing||state.needsRefresh};
}
