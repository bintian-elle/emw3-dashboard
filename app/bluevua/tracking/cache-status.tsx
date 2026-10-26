'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
export function TrackingCacheStatus({refreshing,capturedAt,error}:{refreshing:boolean;capturedAt?:string;error?:string}){
 const router=useRouter();
 useEffect(()=>{
  if(!refreshing)return;
  const interval=setInterval(()=>{if(document.visibilityState==='visible')router.refresh();},5000);
  return()=>clearInterval(interval);
 },[router,refreshing]);
 if(capturedAt)return null;
 return <p role="status" className="text-body-regular text-text-secondary">{error?'Reports are temporarily unavailable. Please try again later.':'Loading reports…'}</p>;
}
