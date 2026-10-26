'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
export function TrackingCacheStatus({refreshing,stale,capturedAt,error}:{refreshing:boolean;stale:boolean;capturedAt?:string;error?:string}){
 const router=useRouter();
 useEffect(()=>{
  if(!refreshing)return;
  const interval=setInterval(()=>{if(document.visibilityState==='visible')router.refresh();},5000);
  return()=>clearInterval(interval);
 },[router,refreshing]);
 if(!refreshing&&!stale&&!error)return <p className="text-caption-1-regular text-text-tertiary">Cached report · Updated hourly in the background</p>;
 return <p role="status" className="text-body-regular text-text-secondary">{error?`${capturedAt?'Showing the last successful cached report. ':''}${error}`:refreshing?capturedAt?'Showing cached data while a background update runs.':'Preparing this report in the background. It will appear automatically when ready.':'Showing an older cached report.'}</p>;
}
