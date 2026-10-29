'use client';

import {useEffect} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {testingSnapshotView} from '@/lib/testing-snapshot-watch';
import {rollingTestingPeriod} from '@/lib/testing-rolling-period';

/** Re-resolve moving date presets after the underlying calendar range changes. */
export function TestingRollingPeriodBoundary(){
 const pathname=usePathname(),params=useSearchParams(),router=useRouter();
 const view=testingSnapshotView(pathname,params.get('returnTo'));
 const preset=params.get('period');
 useEffect(()=>{
  let period=rollingTestingPeriod(view,preset,new Date());
  if(period===null)return;
  const check=()=>{
   const next=rollingTestingPeriod(view,preset,new Date());
   if(next===null||next===period)return;
   period=next;
   window.dispatchEvent(new Event('testing:rolling-period-change'));
   router.refresh();
  };
  const timer=setInterval(check,30_000);
  const onVisibility=()=>{if(document.visibilityState==='visible')check();};
  document.addEventListener('visibilitychange',onVisibility);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',onVisibility);};
 },[view,preset,router]);
 return null;
}
