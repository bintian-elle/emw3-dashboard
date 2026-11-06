'use client';
import {useSearchParams} from 'next/navigation';
import {comparisonRange} from '@/lib/testing-comparison';
import {testingLatestCompleteDate} from '@/lib/testing-period';
import type {ReadoutPeriod} from '@/lib/testing-readout-contract';
import {HistoryGenerateButton} from './history-generate-button';
export function GenerateReadoutButton({period,scope,campaign=''}:{period?:ReadoutPeriod|null;scope:string;campaign?:string}){
 const query=useSearchParams();if(!period?.start||!period.end||period.concludedTestId)return null;
 const channel=scope==='social'?'social-media':scope==='reddit-awareness'||scope==='reddit-conversion'?'reddit':scope;
 const compare=query.get('compare')&&query.get('compare')!=='previousPeriod'?comparisonRange({start:period.start,end:period.end},query.get('compare')!,testingLatestCompleteDate(),{start:query.get('compareStart')??period.start,end:query.get('compareEnd')??period.end}):null;
 return <HistoryGenerateButton purpose="temporary" scope={channel} campaign={campaign} frequency="auto" start={period.start} end={period.end} {...(compare?{compareStart:compare.start,compareEnd:compare.end}:{})}/>;
}
