'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trackingReloadTarget } from '@/lib/website-tracking';

// A navigation timing entry keeps its "reload" type throughout SPA navigation.
// Check once per document so later filter changes and page re-entry stay intact.
let checkedDocumentReload=false;
export function ResetTrackingOnReload(){
 const router=useRouter();
 useEffect(()=>{
  if(checkedDocumentReload)return;
  checkedDocumentReload=true;
  const navigation=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;
  const target=trackingReloadTarget(navigation,window.location.href);
  if(target)router.replace(target);
 },[router]);
 return null;
}
