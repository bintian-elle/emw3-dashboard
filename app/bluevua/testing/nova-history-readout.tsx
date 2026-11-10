'use client';
import {createContext,useContext,useEffect,useId,useState,type ReactNode} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {ArrowLeft,ChevronDown,ChevronUp,History} from 'lucide-react';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {useReviewPreview} from '@/components/application/review/review-preview-context';
import {previewReportForPath} from '@/lib/testing-prompt-preview';
import {selectedReportPeriod} from '@/lib/testing-selected-report';
import {comparisonRange} from '@/lib/testing-comparison';
import {testingLatestCompleteDate} from '@/lib/testing-period';
import type {HistoryReport} from '@/lib/testing-history-match';
import {InsightPresentation,VisualInsightSummary} from './insight-presentation';
import {useTestingPageAiScope} from './testing-ai';
import {InsightMarkdown} from './insight-assets';
import {NovaButton,NovaCard} from './nova-preview-ui';
import {HistoryGenerateButton} from './history-generate-button';
import {NovaInsightQuestion} from './nova-insight-question';
import styles from './nova-preview-sections.module.css';
import historyStyles from './nova-history-menu.module.css';

export function useHistoricalPeriod(){
 const params=useSearchParams(),pathname=usePathname();
 const supportsPeriod=pathname==='/bluevua/testing'||/^\/bluevua\/testing\/(?:google|meta|reddit|edm|social)(?:\/|$)/.test(pathname);
 const selection=selectedReportPeriod(new URLSearchParams(params.toString()));
 return supportsPeriod?selection:null;
}
type HistoryLookup={current:{report:HistoryReport|null;untranslated:boolean;error?:boolean}|null;retry:()=>void};
const HistoryLookupContext=createContext<HistoryLookup>({current:null,retry:()=>{}});
const bilingualHistoryCache=new Map<string,{reports:NonNullable<HistoryReport['visual']>[];generatedAt:string|null}>();
export function useHistoricalReport(){return useContext(HistoryLookupContext).current?.report??null;}

/** One request supplies both the report body and its generation time. */
export function HistoryReportProvider({children}:{children:ReactNode}){
 const history=useHistoricalPeriod(),pathname=usePathname(),params=useSearchParams(),{language}=useSiteLanguage(),scope=previewReportForPath(pathname);
 const compare=history&&params.get('compare')&&params.get('compare')!=='previousPeriod'?comparisonRange(history,params.get('compare')!,testingLatestCompleteDate(),{start:params.get('compareStart')??history.start,end:params.get('compareEnd')??history.end}):null;
 const compareStart=compare?.start,compareEnd=compare?.end;
 const [result,setResult]=useState<{key:string;report:HistoryReport|null;untranslated:boolean;error?:boolean}|null>(null),[attempt,setAttempt]=useState(0);
 const start=history?.start,end=history?.end,frequency=history?.frequency;
 const base=history&&scope?`${history.frequency}:${history.start}:${history.end}:${scope}:${compareStart??''}:${compareEnd??''}`:'';
 const key=base?`${base}:${language}:${attempt}`:'';
 useEffect(()=>{
  if(!frequency||!start||!end||!scope)return;
  if(bilingualHistoryCache.has(base))return;
  const controller=new AbortController(),query=new URLSearchParams({frequency,start,end,scope,language,includeBoth:'1',...(compareStart&&compareEnd?{compareStart,compareEnd}:{})});
  fetch(`/api/testing/history?${query}`,{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('lookup');return response.json() as Promise<{report:HistoryReport|null;untranslated:boolean;bilingual?:{en:NonNullable<HistoryReport['visual']>;zh:NonNullable<HistoryReport['visual']>}}> ;}).then(data=>{if(data.bilingual)bilingualHistoryCache.set(base,{reports:[data.bilingual.en,data.bilingual.zh],generatedAt:data.report?.generatedAt??null});setResult({key,...data});}).catch(()=>{if(!controller.signal.aborted)setResult({key,report:null,untranslated:false,error:true});});
  return()=>controller.abort();
 },[key,scope,language,start,end,frequency,base,compareStart,compareEnd]);
 const cached=bilingualHistoryCache.get(base),visual=cached?.reports[language==='zh'?1:0];
 const current=visual?{report:{title:visual.presentation.title,summary:visual.presentation.summary,sections:[],generatedAt:cached!.generatedAt,visual},untranslated:false}:result?.key===key?result:null;
 return <HistoryLookupContext.Provider value={{current,retry:()=>{bilingualHistoryCache.delete(base);setAttempt(value=>value+1);}}}>{children}</HistoryLookupContext.Provider>;
}

export function NovaHistoryBadge(){
 const history=useHistoricalPeriod(),{language}=useSiteLanguage(),router=useRouter(),pathname=usePathname(),params=useSearchParams(),{current}=useContext(HistoryLookupContext);
 const preview=useReviewPreview();
 if(!history)return null;
 const generatedAt=current?.report?.generatedAt,format=generatedAt?new Intl.DateTimeFormat(language==='zh'?'zh-CN':'en-US',{dateStyle:'medium',timeStyle:'short'}).format(new Date(generatedAt)):null;
 const exit=()=>{const next=new URLSearchParams(params.toString());for(const key of ['history','period','start','end'])next.delete(key);router.push(`${pathname}${next.size?`?${next}`:''}`,{scroll:false});};
 const label=language==='zh'?'返回当前报告':'Return to current report';
 return <div className={`${historyStyles.pageHistory} ${preview?historyStyles.previewHistory:''}`} data-historical-indicator={preview?true:undefined}>{preview&&<NovaButton type="button" variant="outline" onClick={exit}><ArrowLeft aria-hidden="true"/>{label}</NovaButton>}<span className={`${historyStyles.historyBadge} ${preview?historyStyles.previewBadge:''}`}>{language==='zh'?'历史报告':'Historical report'}</span><span>{language==='zh'?'报告时间':'Report period'} · {history.start}{history.start!==history.end?` – ${history.end}`:''}</span>{format&&<span>{language==='zh'?'生成时间':'Generated'} · <time dateTime={generatedAt!}>{format}</time></span>}{!preview&&<button type="button" className={historyStyles.textButton} onClick={exit}>{label}</button>}</div>;
}

export function NovaHistoricalReadout(){
 const history=useHistoricalPeriod(),pathname=usePathname(),params=useSearchParams(),{language}=useSiteLanguage(),chat=useTestingPageAiScope(),scope=previewReportForPath(pathname),zh=language==='zh';
 const comparison=history&&params.get('compare')&&params.get('compare')!=='previousPeriod'?comparisonRange(history,params.get('compare')!,testingLatestCompleteDate(),{start:params.get('compareStart')??history.start,end:params.get('compareEnd')??history.end}):null;
 const {current,retry}=useContext(HistoryLookupContext),[expanded,setExpanded]=useState(false);
 const id=useId(),bottomId=useId();
 if(!history)return null;
 const show=expanded&&!!current?.report;
 return <NovaCard className={styles.readout}><div className={styles.readoutBody}>
  <div className={styles.readoutHeading}><History aria-hidden="true"/><h2>{scope==='overview'?(zh?'总览分析':'Overview analysis'):(zh?'渠道分析':'Channel analysis')}</h2><span>{history.start} – {history.end}</span></div>
  {!scope?<p>{zh?'此范围暂无历史分析。':'No historical analysis is available for this scope.'}</p>:!current?<p role="status">{zh?'正在加载历史分析…':'Loading historical analysis…'}</p>:current.error?<p role="alert">{zh?'历史分析加载失败。':'Could not load the historical analysis.'} <NovaButton variant="ghost" onClick={retry}>{zh?'重试':'Retry'}</NovaButton></p>:!current.report?<><p>{zh?'此范围暂无历史分析。':'No historical analysis is available for this scope.'}</p><HistoryGenerateButton scope={scope!} frequency={history.frequency} start={history.start} end={history.end} {...(comparison?{compareStart:comparison.start,compareEnd:comparison.end}:{})} onComplete={retry}/></>:<>
   {current.untranslated&&<p>{zh?'中文版本暂不可用，显示原文。':'Chinese translation unavailable; showing the original.'}</p>}
   <h3>{current.report.title}</h3><div className={styles.readoutSummary}>{current.report.visual?.presentation.summary_html?<VisualInsightSummary html={current.report.visual.presentation.summary_html} report={current.report.visual} scope="channel"/>:<InsightMarkdown channel={scope}>{current.report.summary}</InsightMarkdown>}</div>
   <div className={styles.readoutActions}><NovaButton variant="outline" aria-expanded={show} aria-controls={id} onClick={()=>setExpanded(value=>!value)}>{show?(zh?'收起完整分析':'Hide full analysis'):(zh?'查看完整分析':'View full analysis')}{show?<ChevronUp/>:<ChevronDown/>}</NovaButton><NovaInsightQuestion scope={scope==='overview'?'overview':'channel'} expanded={show} detailsId={id} bottomId={bottomId} canAsk={chat.canAsk} ask={chat.ask} open={chat.open}/></div>
  </>}
 </div>{show&&current?.report&&<div className={styles.readoutDetails} id={id}>{current.report.visual?<InsightPresentation report={current.report.visual} scope={current.report.visualScope??'channel'}/>:current.report.sections.map((section,index)=><section key={index} className={styles.readoutDetail}>{section.title&&<h3>{section.title}</h3>}<div className={styles.markdown}><InsightMarkdown channel={scope??undefined}>{section.markdown}</InsightMarkdown></div></section>)}<div className={styles.readoutBottom}><NovaButton variant="outline" onClick={()=>setExpanded(false)}>{zh?'收起完整分析':'Hide full analysis'}<ChevronUp/></NovaButton><div id={bottomId} className={styles.questionBottom}/></div></div>}</NovaCard>;
}
