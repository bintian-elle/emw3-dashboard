'use client';

import {useEffect,useState} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {advanceSnapshotVersions,shouldAttemptSnapshotRefresh,testingSnapshotChannels,testingSnapshotView,testingSnapshotWatchKey} from '@/lib/testing-snapshot-watch';
import {clearTestingSnapshotBaseline,getTestingSnapshotBaseline,subscribeTestingSnapshotBaseline} from './testing-snapshot-baseline';

const intervalMs=30_000;

/** Keep already-open live views in sync with published shared cache updates. */
export function TestingSnapshotWatcher(){
 const pathname=usePathname(),params=useSearchParams(),router=useRouter();
 const pageView=testingSnapshotView(pathname,params.get('returnTo'));
 // Individual channel pages already poll their refresh status and update on change.
 const view=pageView==='overview'||pageView==='inventory'?pageView:null;
 const key=view?testingSnapshotWatchKey(view,params.get('period'),params.get('start'),params.get('end')):'';
 const [rollover,setRollover]=useState(0);
 useEffect(()=>{
  const onRollover=()=>{clearTestingSnapshotBaseline(key);setRollover(value=>value+1);};
  window.addEventListener('testing:rolling-period-change',onRollover);
  return ()=>window.removeEventListener('testing:rolling-period-change',onRollover);
 },[key]);
 useEffect(()=>{
  if(!view)return;
  const controller=new AbortController();
  let stopped=false,inFlight=false,timer:ReturnType<typeof setTimeout>|undefined,retryTimer:ReturnType<typeof setTimeout>|undefined;
  let lastTarget:string|null=null,lastAttempt=0;
  let baseline:(string|null)[]|null=getTestingSnapshotBaseline(key),observed:(string|null)[]|null=null;
  const reconcile=(versions:(string|null)[])=>{
   if(!baseline){baseline=versions;return;}
   const next=advanceSnapshotVersions(baseline,versions);
   if(!next.changed||stopped){if(retryTimer)clearTimeout(retryTimer);return;}
   const target=JSON.stringify(next.versions),elapsed=Date.now()-lastAttempt;
   if(shouldAttemptSnapshotRefresh(target,lastTarget,elapsed)){
    lastTarget=target;lastAttempt=Date.now();router.refresh();
   }else{
    if(retryTimer)clearTimeout(retryTimer);
    retryTimer=setTimeout(()=>{if(observed&&!stopped)reconcile(observed);},Math.max(1,10_000-elapsed));
   }
  };
  const schedule=(delay:number)=>{if(timer)clearTimeout(timer);if(!stopped&&document.visibilityState==='visible')timer=setTimeout(()=>void poll(),delay);};
  const poll=async()=>{
   if(stopped||inFlight||document.visibilityState!=='visible')return;
   inFlight=true;
   try{
    const response=await fetch(`/api/testing/snapshot-versions?${key}`,{cache:'no-store',signal:controller.signal});
    if(!response.ok)return;
    const body:unknown=await response.json();
    const values=typeof body==='object'&&body!==null&&'versions' in body?body.versions:null;
    if(!Array.isArray(values)||values.length!==testingSnapshotChannels(view).length||values.some(value=>value!==null&&(typeof value!=='string'||!Number.isFinite(Date.parse(value)))))return;
    observed=values;
    reconcile(values);
   }catch{/* Retain the currently displayed data and retry on the next check. */}
   finally{inFlight=false;schedule(intervalMs);}
  };
  const onVisibility=()=>{if(document.visibilityState==='visible'&&!inFlight)schedule(0);else if(timer)clearTimeout(timer);};
  const unsubscribe=subscribeTestingSnapshotBaseline(value=>{
   if(value.key!==key)return;
   baseline=value.versions;
   if(observed)reconcile(observed);
  });
  document.addEventListener('visibilitychange',onVisibility);
  schedule(0);
  return ()=>{stopped=true;controller.abort();unsubscribe();if(timer)clearTimeout(timer);if(retryTimer)clearTimeout(retryTimer);document.removeEventListener('visibilitychange',onVisibility);};
 },[view,key,router,rollover]);
 return null;
}
