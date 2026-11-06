'use client';
import {createContext,useContext,useEffect,useId,useState,type ReactNode} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {ChevronDown,ChevronUp,History} from 'lucide-react';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {previewReportForPath} from '@/lib/testing-prompt-preview';
import {testingHistoryPeriod} from '@/lib/testing-navigation';
import type {HistoryReport} from '@/lib/testing-history-match';
import {useTestingStaging} from './testing-staging-context';
import {useTestingPageAiScope} from './testing-ai';
import {InsightMarkdown} from './insight-assets';
import {NovaButton,NovaCard} from './nova-preview-ui';
import {NovaInsightQuestion} from './nova-insight-question';
import styles from './nova-preview-sections.module.css';
import historyStyles from './nova-history-menu.module.css';

export function useHistoricalPeriod(){
 const enabled=useTestingStaging(),params=useSearchParams(),pathname=usePathname();
 const supportsPeriod=pathname==='/bluevua/testing'||/^\/bluevua\/testing\/(?:google|meta|reddit|edm)(?:\/|$)/.test(pathname);
 const selection=testingHistoryPeriod(new URLSearchParams(params.toString()));
 return enabled&&supportsPeriod?selection:null;
}
type HistoryLookup={current:{report:HistoryReport|null;untranslated:boolean;error?:boolean}|null;retry:()=>void};
const HistoryLookupContext=createContext<HistoryLookup>({current:null,retry:()=>{}});

/** One request supplies both the report body and its generation time. */
export function HistoryReportProvider({children}:{children:ReactNode}){
 const history=useHistoricalPeriod(),pathname=usePathname(),{language}=useSiteLanguage(),scope=previewReportForPath(pathname);
 const [result,setResult]=useState<{key:string;report:HistoryReport|null;untranslated:boolean;error?:boolean}|null>(null),[attempt,setAttempt]=useState(0);
 const start=history?.start,end=history?.end,frequency=history?.frequency;
 const key=history&&scope?`${history.frequency}:${history.start}:${history.end}:${scope}:${language}:${attempt}`:'';
 useEffect(()=>{
  if(!frequency||!start||!end||!scope||scope==='social-media')return;
  const controller=new AbortController(),query=new URLSearchParams({frequency,start,end,scope,language});
  fetch(`/api/testing/history?${query}`,{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('lookup');return response.json() as Promise<{report:HistoryReport|null;untranslated:boolean}>;}).then(data=>setResult({key,...data})).catch(()=>{if(!controller.signal.aborted)setResult({key,report:null,untranslated:false,error:true});});
  return()=>controller.abort();
 },[key,scope,language,start,end,frequency]);
 return <HistoryLookupContext.Provider value={{current:result?.key===key?result:null,retry:()=>setAttempt(value=>value+1)}}>{children}</HistoryLookupContext.Provider>;
}

export function NovaHistoryBadge(){
 const history=useHistoricalPeriod(),{language}=useSiteLanguage(),router=useRouter(),pathname=usePathname(),params=useSearchParams(),{current}=useContext(HistoryLookupContext);
 if(!history)return null;
 const generatedAt=current?.report?.generatedAt,format=generatedAt?new Intl.DateTimeFormat(language==='zh'?'zh-CN':'en-US',{dateStyle:'medium',timeStyle:'short'}).format(new Date(generatedAt)):null;
 return <div className={historyStyles.pageHistory}><span className={historyStyles.historyBadge}>{language==='zh'?'历史报告':'Historical report'}</span><span>{language==='zh'?'报告时间':'Report period'} · {history.start}{history.start!==history.end?` – ${history.end}`:''}</span>{format&&<span>{language==='zh'?'生成时间':'Generated'} · <time dateTime={generatedAt!}>{format}</time></span>}<button type="button" className={historyStyles.textButton} onClick={()=>{const next=new URLSearchParams(params.toString());for(const key of ['history','period','start','end'])next.delete(key);router.push(`${pathname}${next.size?`?${next}`:''}`,{scroll:false});}}>{language==='zh'?'返回当前报告':'Return to current report'}</button></div>;
}

export function NovaHistoricalReadout(){
 const history=useHistoricalPeriod(),pathname=usePathname(),{language}=useSiteLanguage(),chat=useTestingPageAiScope(),scope=previewReportForPath(pathname),zh=language==='zh';
 const {current,retry}=useContext(HistoryLookupContext),[expanded,setExpanded]=useState(false);
 const id=useId(),bottomId=useId();
 if(!history)return null;
 const show=expanded&&!!current?.report;
 return <NovaCard className={styles.readout}><div className={styles.readoutBody}>
  <div className={styles.readoutHeading}><History aria-hidden="true"/><h2>{scope==='overview'?(zh?'总览分析':'Overview analysis'):(zh?'渠道分析':'Channel analysis')}</h2><span>{history.start} – {history.end}</span></div>
  {!scope||scope==='social-media'?<p>{zh?'此范围暂无历史分析。':'No historical analysis is available for this scope.'}</p>:!current?<p role="status">{zh?'正在加载历史分析…':'Loading historical analysis…'}</p>:current.error?<p role="alert">{zh?'历史分析加载失败。':'Could not load the historical analysis.'} <NovaButton variant="ghost" onClick={retry}>{zh?'重试':'Retry'}</NovaButton></p>:!current.report?<p>{zh?'此范围暂无历史分析。':'No historical analysis is available for this scope.'}</p>:<>
   {current.untranslated&&<p>{zh?'中文版本暂不可用，显示原文。':'Chinese translation unavailable; showing the original.'}</p>}
   <h3>{current.report.title}</h3><div className={styles.readoutSummary}><InsightMarkdown channel={scope}>{current.report.summary}</InsightMarkdown></div>
   <div className={styles.readoutActions}><NovaButton variant="outline" aria-expanded={show} aria-controls={id} onClick={()=>setExpanded(value=>!value)}>{show?(zh?'收起完整分析':'Hide full analysis'):(zh?'查看完整分析':'View full analysis')}{show?<ChevronUp/>:<ChevronDown/>}</NovaButton><NovaInsightQuestion scope={scope==='overview'?'overview':'channel'} expanded={show} detailsId={id} bottomId={bottomId} canAsk={chat.canAsk} ask={chat.ask} open={chat.open}/></div>
  </>}
 </div>{show&&current?.report&&<div className={styles.readoutDetails} id={id}>{current.report.sections.map((section,index)=><section key={index} className={styles.readoutDetail}>{section.title&&<h3>{section.title}</h3>}<div className={styles.markdown}><InsightMarkdown channel={scope??undefined}>{section.markdown}</InsightMarkdown></div></section>)}<div className={styles.readoutBottom}><NovaButton variant="outline" onClick={()=>setExpanded(false)}>{zh?'收起完整分析':'Hide full analysis'}<ChevronUp/></NovaButton><div id={bottomId} className={styles.questionBottom}/></div></div>}</NovaCard>;
}
