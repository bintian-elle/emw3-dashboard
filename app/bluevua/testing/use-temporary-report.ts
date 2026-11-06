'use client';
import {useEffect,useMemo,useState} from 'react';import {useSearchParams} from 'next/navigation';
import {comparisonRange} from '@/lib/testing-comparison';import {testingLatestCompleteDate} from '@/lib/testing-period';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {useTemporaryReportContext} from './temporary-report-owner';
import {readTemporaryReport,temporaryReportKey} from './temporary-report-cache';
import type {PmaxReadableReport} from '@/lib/testing-insight-presentation';
export function useTemporaryReport(scope:string,campaign:string,start?:string,end?:string){
 const query=useSearchParams(),{language}=useSiteLanguage(),{owner,revisions}=useTemporaryReportContext();const compare=start&&end&&query.get('compare')&&query.get('compare')!=='previousPeriod'?comparisonRange({start,end},query.get('compare')!,testingLatestCompleteDate(),{start:query.get('compareStart')??start,end:query.get('compareEnd')??end}):null;
 const compareStart=compare?.start,compareEnd=compare?.end;
 const channel=scope==='social'?'social-media':scope==='reddit-awareness'||scope==='reddit-conversion'?'reddit':scope;
 const key=useMemo(()=>({owner,revision:revisions[channel]??'',scope:channel,campaign,start:start??'',end:end??'',language:language==='zh'?'zh' as const:'en' as const,...(compareStart&&compareEnd?{compareStart,compareEnd}:{})}),[owner,revisions,channel,campaign,start,end,compareStart,compareEnd,language]),id=temporaryReportKey(key);
 const [value,setValue]=useState<{id:string;en?:PmaxReadableReport;zh?:PmaxReadableReport}|null>(null);
 useEffect(()=>{const read=()=>{const pair=readTemporaryReport(key);setValue(pair?{id,...pair}:null);};read();window.addEventListener('testing-temporary-report-updated',read);return()=>window.removeEventListener('testing-temporary-report-updated',read);},[id,key]);
 return value?.id===id?value[language==='zh'?'zh':'en']:null;
}
