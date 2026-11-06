'use client';
import {useEffect,useState} from 'react';import {useSearchParams} from 'next/navigation';
import {historyGenerationRequest} from '@/lib/testing-history-generation';
import {comparisonRange} from '@/lib/testing-comparison';import {testingLatestCompleteDate} from '@/lib/testing-period';
import type {PmaxReadableReport} from '@/lib/testing-insight-presentation';
type Pair={en:PmaxReadableReport;zh:PmaxReadableReport};
const cache=new Map<string,Pair|null>();
const pending=new Map<string,Promise<Pair|null>>();
export function useMatchedReport(scope:string|null,start:string,end:string,language:string,enabled:boolean){
 const query=useSearchParams(),latest=testingLatestCompleteDate();let params='';
 try{if(enabled&&scope){const custom=query.get('compare')&&query.get('compare')!=='previousPeriod'?comparisonRange({start,end},query.get('compare')!,latest,{start:query.get('compareStart')??start,end:query.get('compareEnd')??end}):null;const period=historyGenerationRequest({scope,frequency:'auto',start,end,...(custom?{compareStart:custom.start,compareEnd:custom.end}:{})},latest);if(period.kind!=='custom')params=new URLSearchParams({scope,frequency:period.kind,start,end,compareStart:period.compareStart,compareEnd:period.compareEnd,includeBoth:'1',databaseOnly:'1'}).toString();}}catch{/* Invalid or incomplete selections do not match reports. */}
 const [state,setState]=useState<{key:string;pair:Pair|null;error?:boolean}|null>(null),[version,setVersion]=useState(0);
 useEffect(()=>{const refresh=()=>{cache.clear();setState(null);setVersion(value=>value+1);};window.addEventListener('testing-history-generated',refresh);return()=>window.removeEventListener('testing-history-generated',refresh);},[]);
 useEffect(()=>{if(!params)return;let cancelled=false;if(cache.has(params))return;let request=pending.get(params);if(!request){request=fetch(`/api/testing/history?${params}`,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('lookup');return r.json();}).then(value=>{const pair=value.bilingual??null;cache.set(params,pair);return pair;}).finally(()=>pending.delete(params));pending.set(params,request);}void request.then(pair=>{if(!cancelled)setState({key:params,pair});}).catch(()=>{if(!cancelled)setState({key:params,pair:null,error:true});});return()=>{cancelled=true;};},[params,version]);
 const current=state?.key===params?state:null,pair=current?current.pair:cache.get(params);return {report:pair?.[language==='zh'?'zh':'en']??null,checking:Boolean(params)&&!current&&!cache.has(params),error:Boolean(current?.error)};
}
