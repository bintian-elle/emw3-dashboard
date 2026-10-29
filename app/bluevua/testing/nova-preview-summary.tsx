'use client';

import {useEffect,useId,useLayoutEffect,useRef,useState,type MouseEvent} from 'react';
import {useSearchParams} from 'next/navigation';
import {ChevronDown,ChevronUp,Sparkles} from 'lucide-react';
import {Streamdown} from 'streamdown';
import {cjk} from '@streamdown/cjk';
import {code} from '@streamdown/code';
import {math} from '@streamdown/math';
import {mermaid} from '@streamdown/mermaid';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {conclusionOnlyMarkdown} from '@/lib/testing-prompt-presentation';
import {liveOverviewExecutiveSummary} from '@/lib/testing-readout-live-overview';
import {testingReadoutContent} from '@/lib/testing-readout-content';
import {testingReadoutKey,type CachedPeriodReadout,type ReadoutPeriod} from '@/lib/testing-readout-contract';
import type {OverviewHeadlineMetrics} from '@/lib/overview-headline-metrics';
import type {PromptPreviewManifest,PromptPreviewReport} from '@/lib/testing-prompt-preview';
import {useTestingAiScope} from './testing-ai';
import {NovaButton,NovaCard} from './nova-preview-ui';
import {NovaInsightQuestion} from './nova-insight-question';
import {scrollTestingContentBy} from './scroll-testing-content';
import styles from './nova-preview-sections.module.css';
import {useReadoutVersion} from './use-readout-version';

type Preview={manifest:PromptPreviewManifest;reports:PromptPreviewReport[];status:{status?:string};disabled?:boolean};
const plugins={cjk,code,math,mermaid};

/** Uses the existing saved insights APIs and AI scope, with isolated Nova UI. */
export function NovaOverviewSummary({period,overviewMetrics}:{period:ReadoutPeriod;overviewMetrics:OverviewHeadlineMetrics}){
 const {language}=useSiteLanguage(),zh=language==='zh',query=useSearchParams();
 const chat=useTestingAiScope('overview','overview',period),detailsId=useId(),bottomId=useId();
 const [preview,setPreview]=useState<{key:string;value:Preview|null}>({key:'',value:null});
 const [cached,setCached]=useState<{key:string;value:CachedPeriodReadout|null}>({key:'',value:null});
 const [expandedKey,setExpandedKey]=useState<string|null>(null);
 const buttonRef=useRef<HTMLButtonElement>(null),collapseY=useRef<number|null>(null);
 const periodKey=testingReadoutKey(period),requestKey=`${language}:${periodKey??`${period.start}:${period.end}`}`;
 const version=useReadoutVersion([periodKey,'period:reddit-lifetime','period:social-lifetime'],language);
 useEffect(()=>{
  let cancelled=false,timer:ReturnType<typeof setTimeout>|undefined;
  const load=async()=>{
   let poll=true;
   try {
    const params=new URLSearchParams({...Object.fromEntries(query.entries()),language});
    if(version.expected)params.set('expected',version.expected);
    const readoutParams=new URLSearchParams({language,key:periodKey??''});if(version.expected)readoutParams.set('expected',version.expected);
    const [previewResponse,cacheResponse]=await Promise.all([
     fetch(`/api/testing/preview?${params}`,{cache:'no-store'}),
     periodKey?fetch(`/api/testing/readouts?${readoutParams}`,{cache:'no-store'}):Promise.resolve(null),
    ]);
    const result=previewResponse.ok?await previewResponse.json() as Preview:null;
    const records=cacheResponse?.ok?await cacheResponse.json() as {records?:Array<{cache_key:string;payload:CachedPeriodReadout}>}:null;
    if(cancelled)return;
    const record=records?.records?.find(item=>item.cache_key===periodKey);
    if(previewResponse.ok)setPreview({key:requestKey,value:result&&!result.disabled?result:null});
    if(!periodKey||cacheResponse?.ok)setCached({key:requestKey,value:record?testingReadoutContent(record.cache_key,record.payload):null});
    poll=!previewResponse.ok||Boolean(periodKey&&cacheResponse&&!cacheResponse.ok)||Boolean(result&&!result.disabled&&result.status?.status!=='completed');
   } catch { /* Keep the current saved report on transient failure. */ }
   if(!cancelled&&poll)timer=setTimeout(()=>void load(),20000);
  };
  void load();return()=>{cancelled=true;if(timer)clearTimeout(timer);};
 },[language,periodKey,query,requestKey,version.revision,version.expected]);
 const current=preview.key===requestKey?preview.value:null;
 const saved=cached.key===requestKey?cached.value:null;
 const preset=query.get('period');
 const supported=!preset||preset==='lastWeek'||(query.get('start')===current?.manifest.period.start&&query.get('end')===current?.manifest.period.end);
 const previewReport=current&&((current.manifest.language==='en')===(language==='en'))&&(supported||current.manifest.run_id.startsWith('published-'))?current.reports.find(report=>report.report_id==='overview'):undefined;
 const savedSummary=saved?.overview?.executive_summary??null;
 const summary=previewReport?liveOverviewExecutiveSummary(previewReport.executive_summary,overviewMetrics,language):savedSummary?liveOverviewExecutiveSummary(savedSummary,overviewMetrics,language):null;
 const sections=previewReport?.sections??[
  ...(saved?.overview?.key_findings?.length?[{title:zh?'关键洞察':'Key insights',markdown:saved.overview.key_findings.map(item=>`- ${item}`).join('\n')}]:[]),
  ...(saved?.overview?.recommended_actions?.length?[{title:zh?'优化重点':'Optimization priorities',markdown:saved.overview.recommended_actions.map(item=>`- ${item}`).join('\n')}]:[]),
  ...(saved?.overview?.data_gaps?.length?[{title:zh?'数据覆盖':'Data coverage',markdown:saved.overview.data_gaps.map(item=>`- ${item}`).join('\n')}]:[]),
 ];
 const expanded=expandedKey===requestKey;
 useLayoutEffect(()=>{
  if(expanded||collapseY.current===null)return;
  const y=collapseY.current;collapseY.current=null;const button=buttonRef.current;if(!button)return;
  const rect=button.getBoundingClientRect();scrollTestingContentBy(button,rect.top+rect.height/2-y);button.focus({preventScroll:true});
 },[expanded]);
 const hide=(event:MouseEvent<HTMLButtonElement>)=>{const rect=event.currentTarget.getBoundingClientRect();collapseY.current=event.clientY>0?event.clientY:rect.top+rect.height/2;setExpandedKey(null);};
 return <NovaCard className={styles.readout}>
  <div className={styles.readoutBody}><div className={styles.readoutHeading}><Sparkles aria-hidden="true"/><h2>{zh?'测试总结':previewReport?.title??'Test summary'}</h2><span>{period.start} – {period.end}</span></div>
   {summary?<div className={styles.readoutSummary}>{summary}</div>:<p role="status" className={styles.loading}>{cached.key!==requestKey?(zh?'正在获取分析…':'Fetching analysis…'):(zh?'此时间区间暂无可用分析。':'Analysis is not available for this reporting period.')}</p>}
   {summary&&<div className={styles.readoutActions}><NovaButton ref={buttonRef} type="button" variant="outline" aria-expanded={expanded} aria-controls={detailsId} onClick={()=>setExpandedKey(current=>current===requestKey?null:requestKey)}>{expanded?(zh?'收起完整分析':'Hide full analysis'):(previewReport?(zh?'查看完整分析':'View full analysis'):(zh?'查看全部洞察与数据覆盖':'View all insights and data coverage'))}{expanded?<ChevronUp aria-hidden="true"/>:<ChevronDown aria-hidden="true"/>}</NovaButton>{expanded&&sections.map((section,index)=><NovaButton key={`${section.title}:${index}`} type="button" size="sm" variant="ghost" onClick={()=>document.getElementById(`${detailsId}-${index}`)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})}>{section.title}</NovaButton>)}<NovaInsightQuestion scope="overview" expanded={expanded} detailsId={detailsId} bottomId={bottomId} canAsk={chat.canAsk} ask={chat.ask} open={chat.open}/></div>}
  </div>
  {expanded&&<div id={detailsId} className={styles.readoutDetails}>{sections.map((section,index)=><section key={`${section.title}:${index}`} id={`${detailsId}-${index}`} className={styles.readoutDetail}><h3>{section.title}</h3><div className={styles.markdown}><Streamdown plugins={plugins} isAnimating={false} controls={{table:false}} tableMaxHeight={0}>{conclusionOnlyMarkdown(section.markdown)}</Streamdown></div></section>)}<div className={styles.readoutBottom}><NovaButton type="button" variant="outline" aria-controls={detailsId} aria-expanded onClick={hide}>{zh?'收起完整分析':'Hide full analysis'}<ChevronUp aria-hidden="true"/></NovaButton><div id={bottomId} className={styles.questionBottom}/></div></div>}
 </NovaCard>;
}
