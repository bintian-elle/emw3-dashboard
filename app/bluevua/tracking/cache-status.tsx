'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
export function TrackingCacheStatus({refreshing,capturedAt,error}:{refreshing:boolean;capturedAt?:string;error?:string}){
 const router=useRouter();
 const {language}=useSiteLanguage(),zh=language==='zh';
 useEffect(()=>{
  if(!refreshing)return;
  const interval=setInterval(()=>{if(document.visibilityState==='visible')router.refresh();},5000);
  return()=>clearInterval(interval);
 },[router,refreshing]);
 if(capturedAt)return null;
 return <p role="status" className="text-body-regular text-text-secondary">{error?(zh?'报告暂不可用，请稍后重试。':'Reports are temporarily unavailable. Please try again later.'):(zh?'正在加载报告…':'Loading reports…')}</p>;
}
