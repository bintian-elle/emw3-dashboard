'use client';

import {createContext,useContext,useEffect,useMemo,useState,useTransition,type ReactNode} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {ArrowLeftRight} from 'lucide-react';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {useReviewPreview} from '@/components/application/review/review-preview-context';
import type {TestingPeriodInput} from '@/lib/testing-google';
import {redditContentPeriod} from '@/lib/reddit-content-testing';
import {resolveTestingPeriod,testingLatestCompleteDate} from '@/lib/testing-period';
import {comparisonRange,matchTestingRange,periodOnPeriod,type ComparisonPacket,type ComparisonRange} from '@/lib/testing-comparison';
import {testingSnapshotView} from '@/lib/testing-snapshot-watch';
import {NovaReportingPeriodCustom,novaReportingPeriods} from './nova-reporting-period';
import {Button} from '@/components/base/buttons/button';
import {Select,SelectItem} from '@/components/base/select/select';
import {Badge} from '@/components/ui/badge';
import styles from './testing-comparison.module.css';

type State={enabled:boolean;packet:ComparisonPacket|null;loading:boolean;error:boolean};
const Context=createContext<State>({enabled:false,packet:null,loading:false,error:false});
export function TestingComparisonProvider({enabled,children}:{enabled:boolean;children:ReactNode}){
 const path=usePathname(),query=useSearchParams(),view=testingSnapshotView(path,query.get('returnTo'));
 const allowed=enabled&&!!view&&view!=='inventory'&&view!=='social';
 const latest=testingLatestCompleteDate(),range=(path.startsWith('/bluevua/testing/reddit')&&(!query.get('period')||query.get('period')==='sinceSep24')?redditContentPeriod():resolveTestingPeriod(latest,{preset:(query.get('period')??'lastWeek') as TestingPeriodInput['preset'],start:query.get('start')??undefined,end:query.get('end')??undefined}));
 const comparison=comparisonRange(range,query.get('compare')??'previousPeriod',latest,{start:query.get('compareStart')??range.start,end:query.get('compareEnd')??range.end});
 const key=`${path}:${range.start}:${range.end}:${comparison.start}:${comparison.end}`;
 const [state,setState]=useState<{key:string;packet:ComparisonPacket|null;error:boolean}|null>(null);
 useEffect(()=>{
  if(!allowed)return;
  const controller=new AbortController();
  const params=new URLSearchParams({start:comparison.start,end:comparison.end,path});
  void fetch(`/api/testing/comparison?${params}`,{signal:controller.signal,cache:'no-store'}).then(async response=>{if(!response.ok)throw Error('Comparison unavailable');return response.json() as Promise<ComparisonPacket>;}).then(packet=>{if(!controller.signal.aborted)setState({key,packet,error:false});}).catch(()=>{if(!controller.signal.aborted)setState({key,packet:null,error:true});});
  return()=>controller.abort();
 },[allowed,path,key,comparison.start,comparison.end]);
 const value=useMemo(()=>({enabled:allowed,packet:state?.key===key?state.packet:null,loading:allowed&&state?.key!==key,error:state?.key===key&&state.error}),[allowed,key,state]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function TestingComparisonControls({children}:{children:ReactNode}){
 const context=useContext(Context),query=useSearchParams(),path=usePathname(),router=useRouter(),{language}=useSiteLanguage(),zh=language==='zh';
 const preview=useReviewPreview();
 const [pending,startTransition]=useTransition(),[custom,setCustom]=useState<'main'|'compare'|null>(null);
 const latest=testingLatestCompleteDate(),current=(path.startsWith('/bluevua/testing/reddit')&&(!query.get('period')||query.get('period')==='sinceSep24')?redditContentPeriod():resolveTestingPeriod(latest,{preset:(query.get('period')??'lastWeek') as TestingPeriodInput['preset'],start:query.get('start')??undefined,end:query.get('end')??undefined}));
 const compare=query.get('compare')??'previousPeriod',previous=comparisonRange(current,compare,latest,{start:query.get('compareStart')??current.start,end:query.get('compareEnd')??current.end});
 if(!context.enabled)return <>{children}</>;
 const update=(next:URLSearchParams)=>startTransition(()=>router.replace(`${path}?${next}`,{scroll:false}));
 const setRange=(which:'main'|'compare',range:ComparisonRange)=>{
  const next=new URLSearchParams(query.toString());
  const preset=matchTestingRange(range,latest);
  next.set(which==='main'?'period':'compare',preset);
  const [startKey,endKey]=which==='main'?['start','end']:['compareStart','compareEnd'];
  if(preset==='custom'){next.set(startKey,range.start);next.set(endKey,range.end);}else{next.delete(startKey);next.delete(endKey);}
  setCustom(null);update(next);
 };
 const choose=(which:'main'|'compare',value:string)=>{
  if(value==='custom'){setCustom(which);return;}
  const next=new URLSearchParams(query.toString());next.set(which==='main'?'period':'compare',value);
  for(const key of which==='main'?['start','end']:['compareStart','compareEnd'])next.delete(key);
  setCustom(null);update(next);
 };
 const swap=()=>{
  const next=new URLSearchParams(query.toString());
  for(const [prefix,range] of [['main',previous],['compare',current]] as const){const preset=matchTestingRange(range,latest),main=prefix==='main';next.set(main?'period':'compare',preset);if(preset==='custom'){next.set(main?'start':'compareStart',range.start);next.set(main?'end':'compareEnd',range.end);}else{next.delete(main?'start':'compareStart');next.delete(main?'end':'compareEnd');}}
  setCustom(null);update(next);
 };
 const mainOptions=path.startsWith('/bluevua/testing/reddit')?[['sinceSep24','Lifetime (Sep 24, 2026 – Now)'] as const,...novaReportingPeriods]:novaReportingPeriods;
 const options=[['previousPeriod',zh?'上一周期':'Previous period'],['previousYear',zh?'去年同期':'Previous year'],...novaReportingPeriods] as const;
 return <div className={styles.controls} data-comparison-controls={preview?true:undefined} aria-busy={pending}>
  <div className={styles.picker}><span className={styles.label}>{zh?'报告周期':'Time Period'}</span><ComparisonPeriodSelect ariaLabel={zh?'报告周期':'Time Period'} options={mainOptions} value={custom==='main'?'custom':query.get('period')??(path.startsWith('/bluevua/testing/reddit')?'sinceSep24':'lastWeek')} disabled={pending} onValueChange={value=>choose('main',value)}/><span className={styles.dates}>{current.start} – {current.end}</span>{(custom==='main'||query.get('period')==='custom')&&<NovaReportingPeriodCustom zh={zh} disabled={pending} start={current.start} end={current.end} onApply={range=>setRange('main',{start:range.start.toString(),end:range.end.toString()})}/>}</div>
  <Button className={styles.swap} variant="secondary" iconOnly leadingIcon={ArrowLeftRight} disabled={pending} onClick={swap} aria-label={zh?'交换报告与对比周期':'Swap reporting and comparison periods'}/>
  <div className={styles.picker}><span className={styles.label}>{zh?'对比周期':'Compare With'}</span><ComparisonPeriodSelect ariaLabel={zh?'对比周期':'Compare With'} value={custom==='compare'?'custom':compare} options={options} disabled={pending} onValueChange={value=>choose('compare',value)}/><span className={styles.dates}>{previous.start} – {previous.end}</span>{(custom==='compare'||compare==='custom')&&<NovaReportingPeriodCustom zh={zh} disabled={pending} start={previous.start} end={previous.end} onApply={range=>setRange('compare',{start:range.start.toString(),end:range.end.toString()})}/>}</div>
  <ComparisonStatus/>
 </div>;
}
function ComparisonStatus(){const state=useContext(Context),{language}=useSiteLanguage(),zh=language==='zh';if(!state.loading&&!state.error&&!state.packet?.unavailable.length)return null;return <span className={styles.status} role="status">{state.loading?(zh?'正在加载对比数据…':'Loading comparison…'):state.error?(zh?'对比数据暂不可用':'Comparison unavailable'):`${zh?'对比期暂无数据':'No published comparison data'}: ${state.packet?.unavailable.join(', ')}`}</span>;}
export function ComparisonDelta({entity,metric,value}:{entity:string;metric:string;value:number|null|undefined}){
 const state=useContext(Context);
 if(!state.enabled)return null;
 return <ComparisonValueDelta metric={metric} value={value} previous={state.packet?.rows[entity]?.[metric]} loading={state.loading}/>;
}
export function ComparisonValueDelta({metric,value,previous,loading=false}:{metric:string;value:number|null|undefined;previous:number|null|undefined;loading?:boolean}){
 const {language}=useSiteLanguage(),delta=periodOnPeriod(value,previous);
 const label=loading?'… PoP':delta==null?'--% PoP':`${delta>=0?'↑':'↓'} ${Math.abs(delta*100).toFixed(1)}% PoP`;
 const inverse=['cpa','cpc','cpm','costPerReach','costPerThousandReach'].includes(metric),good=delta!=null&&(inverse?delta<=0:delta>=0);
 const previousDisplay=previous==null?'—':new Intl.NumberFormat('en-US',['ctr','cvr','hookRate','openRate','clickRate','secondModuleClickRate','Click Rate','Open Rate','Module 2 CTR'].includes(metric)?{style:'percent',maximumFractionDigits:2}:['spend','revenue','cpa','cpc','cpm','aov','costPerReach','Total Revenue'].includes(metric)?{style:'currency',currency:'USD',maximumFractionDigits:2}:{maximumFractionDigits:2}).format(previous);
 return <div className={styles.delta}><Badge variant={delta==null?'secondary':good?'success':'danger'} title={language==='zh'?`对比期: ${previousDisplay}`:`Comparison: ${previousDisplay}`}>{label}</Badge></div>;
}

/** Same shared select primitive, caption style and labels as EDM's Picker. */
export function ComparisonPeriodSelect({value,onValueChange,disabled,ariaLabel,options=novaReportingPeriods}:{value:string;onValueChange:(value:string)=>void;disabled?:boolean;ariaLabel:string;options?:readonly (readonly [string,string])[]}){
 const {language}=useSiteLanguage();
 const translated:Record<string,string>={lastWeek:'上周（周二至周一）',wtd:'本周至今',mtd:'本月至今',ytd:'今年至今',last7:'最近 7 天',last30:'最近 30 天',last90:'最近 90 天',custom:'自定义',sinceSep24:'全周期（2026 年 9 月 24 日至今）'};
 return <Select aria-label={ariaLabel} selectedKey={value} isDisabled={disabled} onSelectionChange={key=>onValueChange(String(key))}>{options.map(([id,label])=><SelectItem key={id} id={id}>{language==='zh'?(translated[id]??label):label}</SelectItem>)}</Select>;
}
