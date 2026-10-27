import 'server-only';
import {after} from 'next/server';
import {readTrackingPageCache,refreshTrackingPageCache} from './website-tracking-page-cache';
import {fetchTrackingPage} from './website-tracking-page-live';
import type {TrackingPageScope} from './website-tracking-pages';
import type {TrackingPeriod} from './website-tracking';
export async function getTrackingPage(period:TrackingPeriod,device:string,scope:TrackingPageScope){
 const state=await readTrackingPageCache(period,device,scope);
 if(state.needsRefresh)after(async()=>{try{await refreshTrackingPageCache(period,device,scope,()=>fetchTrackingPage(period,device,scope));}catch{console.error('Tracking page refresh failed.');}});
 return {...state,refreshing:state.refreshing||state.needsRefresh};
}
