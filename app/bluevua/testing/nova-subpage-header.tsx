'use client';

import {useEffect,useId,useLayoutEffect,useRef,useState,useTransition,type MouseEvent,type ReactNode} from 'react';
import Link from 'next/link';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {ArrowLeft,ChevronDown,ChevronUp,LayoutDashboard,Sparkles} from 'lucide-react';
import {Streamdown} from 'streamdown';
import {cjk} from '@streamdown/cjk';
import {code} from '@streamdown/code';
import {math} from '@streamdown/math';
import {mermaid} from '@streamdown/mermaid';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {conclusionOnlyMarkdown} from '@/lib/testing-prompt-presentation';
import {liveOverviewExecutiveSummary} from '@/lib/testing-readout-live-overview';
import {redditSinceStartLabel,redditSinceStartPreset} from '@/lib/reddit-testing-period';
import {previewReportForPath,type PromptPreviewManifest,type PromptPreviewReport} from '@/lib/testing-prompt-preview';
import type {OverviewHeadlineMetrics} from '@/lib/overview-headline-metrics';
import {useTestingPageAiScope} from './testing-ai';
import {NovaButton,NovaCard} from './nova-preview-ui';
import {NovaReportingPeriodSelect,NovaReportingPeriodCustom,novaReportingPeriods,useNovaPeriodDraft} from './nova-reporting-period';
import {NovaInsightQuestion} from './nova-insight-question';
import {scrollTestingContentBy} from './scroll-testing-content';
import {NovaAskAiButton} from './nova-ask-ai-button';
import {NovaShareButton} from './nova-share-button';
import reportStyles from './nova-preview-sections.module.css';
import styles from './nova-subpage-header.module.css';
import {testingReadoutKey} from '@/lib/testing-readout-contract';
import {resolveTestingPeriod,testingLatestCompleteDate} from '@/lib/testing-period';
import {testingSnapshotInput} from '@/lib/testing-snapshot-watch';
import {useReadoutVersion} from './use-readout-version';

type Props={section?:string;title:string;redditDateFilter:boolean;showReportingPeriod:boolean;backHref?:string;backLabel:string;overviewMetrics?:OverviewHeadlineMetrics;sharePeriod?:{start:string;end:string}};
const plugins={cjk,code,math,mermaid};

export function NovaSubpageHeaderGate(props:Props&{children:ReactNode}){
 return <><NovaSubpageHeader {...props}/><NovaChannelReport overviewMetrics={props.overviewMetrics}/></>;
}

function NovaSubpageHeader({section,title,redditDateFilter,showReportingPeriod,backHref,backLabel,sharePeriod}:Props){
 const query=useSearchParams(),pathname=usePathname(),router=useRouter(),chat=useTestingPageAiScope();
 const {language}=useSiteLanguage(),zh=language==='zh';
 const [pending,startTransition]=useTransition();
 const {start,end,setStart,setEnd,customDraft,setCustomDraft}=useNovaPeriodDraft(query.get('period'),query.get('start'),query.get('end'));
 const options=redditDateFilter?[[redditSinceStartPreset,redditSinceStartLabel] as const,...novaReportingPeriods]:novaReportingPeriods;
 const requested=query.get('period');
 const selected=customDraft?'custom':options.some(([value])=>value===requested)?requested!:(redditDateFilter?redditSinceStartPreset:'lastWeek');
 const update=(period:string,range?:{start:string;end:string})=>{
  if(pending)return;
  const next=new URLSearchParams(query.toString());next.set('period',period);
  if(period==='custom'&&range){next.set('start',range.start);next.set('end',range.end);}else{next.delete('start');next.delete('end');}
  if(next.toString()!==query.toString())startTransition(()=>router.replace(`${pathname}?${next}`,{scroll:false}));
 };
 const overviewQuery=new URLSearchParams();
 for(const key of ['period','start','end']){const value=query.get(key);if(value)overviewQuery.set(key,value);}
 return <header data-testing-header className={styles.header}>
  <div className={styles.identity}>
   <h1>{zh&&title==='Content testing overview'?'内容测试总览':title}</h1>
   {section&&<div className={styles.backLinks}>{backHref&&<NovaButton asChild variant="outline"><Link href={backHref}><ArrowLeft aria-hidden="true"/>{backLabel}</Link></NovaButton>}<NovaButton asChild variant="ghost"><Link href={`/bluevua/testing?${overviewQuery}`}><LayoutDashboard aria-hidden="true"/>{zh?'返回总览':'Back to overview'}</Link></NovaButton></div>}
  </div>
  <div className={styles.controls}>
   {showReportingPeriod&&<><label htmlFor="nova-subpage-period">{zh?'报告周期':'Reporting period'}</label><NovaReportingPeriodSelect id="nova-subpage-period" ariaLabel={zh?'测试报告周期':'Testing reporting period'} value={selected} options={options} disabled={pending} onValueChange={value=>{if(value==='custom')setCustomDraft(true);else{setCustomDraft(false);update(value);}}}/>{selected==='custom'&&<NovaReportingPeriodCustom zh={zh} start={start} end={end} disabled={pending} onApply={range=>{const next={start:range.start.toString(),end:range.end.toString()};setStart(next.start);setEnd(next.end);update('custom',next);}}/>}</>}
   <NovaShareButton disabled={pending} freezePeriod={showReportingPeriod} period={sharePeriod}/><NovaAskAiButton onClick={()=>chat.isOpen?chat.close():chat.open()} aria-controls="testing-ai-panel" aria-expanded={chat.isOpen}>{zh?'询问 AI':'Ask AI'}</NovaAskAiButton>
  </div>
 </header>;
}

type Preview={manifest:PromptPreviewManifest;reports:PromptPreviewReport[];status:{status?:string};disabled?:boolean};
function Question({expanded,detailsId,bottomId}:{expanded:boolean;detailsId:string;bottomId:string}){
 const chat=useTestingPageAiScope();
 return <NovaInsightQuestion scope="channel" expanded={expanded} detailsId={detailsId} bottomId={bottomId} canAsk={chat.canAsk} ask={chat.ask} open={chat.open}/>;
}

function NovaChannelReport({overviewMetrics}:{overviewMetrics?:OverviewHeadlineMetrics}){
 const {language}=useSiteLanguage(),pathname=usePathname(),query=useSearchParams(),baseId=previewReportForPath(pathname);
 const [previewState,setPreview]=useState<{key:string;value:Preview}|null>(null),[expandedKey,setExpandedKey]=useState<string|null>(null);
 const requestKey=`${language}:${pathname}:${query.toString()}`;
 const preview=previewState?.key===requestKey?previewState.value:null;
 const presetForReadout=query.get('period')??'lastWeek';
 const labels:Record<string,string>={lastWeek:'Last Week (Tue–Mon)',wtd:'Week-to-date',mtd:'Month-to-date'};
 const periodKey=testingReadoutKey({label:labels[presetForReadout]??'Custom',...resolveTestingPeriod(testingLatestCompleteDate(),testingSnapshotInput('meta',presetForReadout,query.get('start'),query.get('end')) as Parameters<typeof resolveTestingPeriod>[1])});
 const version=useReadoutVersion(baseId?[periodKey,'period:reddit-lifetime','period:social-lifetime']:[],language);
 const contentId=useId(),bottomId=useId(),buttonRef=useRef<HTMLButtonElement>(null),collapseY=useRef<number|null>(null);
 useEffect(()=>{
  if(!baseId)return;
  let cancelled=false,timer:ReturnType<typeof setTimeout>|undefined;
  const load=async()=>{let poll=true;try{const params=new URLSearchParams({...Object.fromEntries(query.entries()),language});if(version.expected)params.set('expected',version.expected);const response=await fetch(`/api/testing/preview?${params}`,{cache:'no-store'});if(response.ok){const data=await response.json() as Preview;if(cancelled)return;if(data.disabled)poll=false;else{setPreview({key:requestKey,value:data});poll=data.status.status!=='completed';}}}catch{/* Retain the last successfully loaded analysis. */}finally{if(!cancelled&&poll)timer=setTimeout(()=>void load(),20000);}};
  void load();return()=>{cancelled=true;if(timer)clearTimeout(timer);};
 },[baseId,language,query,requestKey,version.revision,version.expected]);
 const key=preview&&baseId?`${preview.manifest.run_id}:${baseId}`:null,expanded=!!key&&expandedKey===key;
 useLayoutEffect(()=>{if(expanded||collapseY.current===null)return;const y=collapseY.current;collapseY.current=null;const button=buttonRef.current;if(!button)return;const rect=button.getBoundingClientRect();scrollTestingContentBy(button,rect.top+rect.height/2-y);button.focus({preventScroll:true});},[expanded]);
 if(!preview||!baseId||(preview.manifest.language==='en')!==(language==='en'))return null;
 const zh=language==='zh',preset=query.get('period'),lifetime=baseId==='social-media'||(baseId==='reddit'&&(!preset||preset===redditSinceStartPreset));
 const reportId=baseId==='reddit'&&lifetime?'reddit-lifetime':baseId;
 const supported=lifetime||!preset||preset==='lastWeek'||(query.get('start')===preview.manifest.period.start&&query.get('end')===preview.manifest.period.end);
 if(!supported&&!preview.manifest.run_id.startsWith('published-'))return <NovaCard className={reportStyles.loading}>{zh?'本轮预览使用':'This preview covers'} {preview.manifest.period.start} – {preview.manifest.period.end}{zh?'；请选择 Last Week 查看。':'. Select Last Week to view it.'}</NovaCard>;
 const report=preview.reports.find(item=>item.report_id===reportId);
 if(!report&&preview.manifest.run_id.startsWith('published-'))return null;
 const summary=report&&baseId==='overview'&&overviewMetrics?liveOverviewExecutiveSummary(report.executive_summary,overviewMetrics,language):report?.executive_summary;
 const hide=(event:MouseEvent<HTMLButtonElement>)=>{const rect=event.currentTarget.getBoundingClientRect();collapseY.current=event.clientY>0?event.clientY:rect.top+rect.height/2;setExpandedKey(null);};
 return <NovaCard className={reportStyles.readout}><div className={reportStyles.readoutBody}>
  <div className={reportStyles.readoutHeading}><Sparkles aria-hidden="true"/><h2>{report?.title??(zh?'渠道分析':'Channel analysis')}</h2><span>{lifetime?'Lifetime':`${preview.manifest.period.start} – ${preview.manifest.period.end}`}</span></div>
  {report?<><div className={reportStyles.readoutSummary}>{summary}</div><div className={reportStyles.readoutActions}><NovaButton ref={buttonRef} variant="outline" aria-expanded={expanded} aria-controls={contentId} onClick={()=>setExpandedKey(expanded?null:key)}>{expanded?(zh?'收起完整分析':'Hide full analysis'):(zh?'查看完整分析':'View full analysis')}{expanded?<ChevronUp/>:<ChevronDown/>}</NovaButton>{expanded&&report.sections.map((section,index)=><NovaButton key={section.title} variant="ghost" size="sm" onClick={()=>document.getElementById(`${contentId}-${index}`)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})}>{section.title}</NovaButton>)}<Question expanded={expanded} detailsId={contentId} bottomId={bottomId}/></div></>:<p role="status" className={reportStyles.loading}>{zh?'正在获取分析…':'Fetching analysis…'}</p>}
 </div>{report&&expanded&&<div id={contentId} className={reportStyles.readoutDetails}>{report.sections.map((section,index)=><section key={section.title} id={`${contentId}-${index}`} className={reportStyles.readoutDetail}><h3>{section.title}</h3><div className={reportStyles.markdown}><Streamdown plugins={plugins} isAnimating={false} controls={{table:false}} tableMaxHeight={0}>{conclusionOnlyMarkdown(section.markdown)}</Streamdown></div></section>)}<div className={reportStyles.readoutBottom}><NovaButton variant="outline" aria-expanded aria-controls={contentId} onClick={hide}>{zh?'收起完整分析':'Hide full analysis'}<ChevronUp/></NovaButton><div id={bottomId} className={reportStyles.questionBottom}/></div></div>}</NovaCard>;
}
