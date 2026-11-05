'use client';
import {useState} from 'react';
import {ArrowLeftRight} from 'lucide-react';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {comparisonRange,matchComparisonRange,matchTestingRange,type ComparisonRange} from '@/lib/testing-comparison';
import {resolveTestingPeriod,testingLatestCompleteDate} from '@/lib/testing-period';
import {ComparisonPeriodSelect} from '../testing-comparison';
import {NovaReportingPeriodCustom,novaReportingPeriods} from '../nova-reporting-period';
import {NovaButton} from '../nova-preview-ui';
import styles from './prompts-workspace.module.css';
export function TrialPeriodControls({current,previous,onChange}:{current:ComparisonRange;previous:ComparisonRange;onChange:(current:ComparisonRange,previous:ComparisonRange)=>void}){
 const {language}=useSiteLanguage(),zh=language==='zh',latest=testingLatestCompleteDate();
 const [custom,setCustom]=useState<'main'|'compare'|null>(null);
 const comparePreset=matchComparisonRange(current,previous,latest);
 const updateCurrent=(next:ComparisonRange)=>onChange(next,['previousPeriod','previousYear'].includes(comparePreset)?comparisonRange(next,comparePreset,latest):previous);
 const change=(which:'main'|'compare',value:string)=>{if(value==='custom'){setCustom(which);return;}setCustom(null);const range=which==='main'?resolveTestingPeriod(latest,{preset:value as 'lastWeek'}):comparisonRange(current,value,latest);if(which==='main')updateCurrent(range);else onChange(current,range);};
 return <div className={styles.periodControls}>{(['main','compare'] as const).map((which,index)=><div key={which} style={{display:'contents'}}>{index===1&&<NovaButton className={styles.periodSwap} variant="outline" aria-label={zh?'交换时间':'Swap periods'} onClick={()=>{setCustom(null);onChange(previous,current);}}><ArrowLeftRight/></NovaButton>}<div className={styles.periodPicker}><span className={styles.periodLabel}>{which==='main'?(zh?'报告周期':'Time Period'):(zh?'对比周期':'Compare With')}</span><ComparisonPeriodSelect ariaLabel={which==='main'?'Time Period':'Compare With'} value={custom===which?'custom':(which==='main'?matchTestingRange(current,latest):comparePreset)} options={which==='main'?novaReportingPeriods:[['previousPeriod',zh?'上一周期（环比）':'Previous period (PoP)'],['previousYear',zh?'去年同期':'Previous year'],...novaReportingPeriods]} onValueChange={value=>change(which,value)}/><span className={styles.periodDates}>{(which==='main'?current:previous).start} – {(which==='main'?current:previous).end}</span>{(custom===which||(which==='main'?matchTestingRange(current,latest):comparePreset)==='custom')&&<NovaReportingPeriodCustom zh={zh} {...(which==='main'?current:previous)} onApply={range=>{const next={start:range.start.toString(),end:range.end.toString()};if(which==='main')updateCurrent(next);else onChange(current,next);}}/>}</div></div>)}</div>;
}
