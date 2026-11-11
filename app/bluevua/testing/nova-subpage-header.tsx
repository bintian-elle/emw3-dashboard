'use client';

import {TestingComparisonControls} from './testing-comparison';
import {useChannelReportPeriod} from './channel-report-period';
import {testingAnalysisTitle} from '@/lib/testing-analysis-title';
import {insightPresentationGroups} from '@/lib/testing-insight-presentation';
import {usePmaxPresentation,InsightPresentation} from './insight-presentation';
import {fetchTestingReadoutJson} from '@/lib/testing-readout-fetch';

import {useEffect,useId,useLayoutEffect,useRef,useState,useTransition,type MouseEvent,type ReactNode} from 'react';
import Link from 'next/link';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {ArrowLeft,ChevronDown,ChevronUp,LayoutDashboard,Sparkles} from 'lucide-react';
import {InsightText,InsightMarkdown} from './insight-assets';
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
import {GenerateReadoutButton} from './generate-readout-button';
import {useMatchedReport} from './use-matched-report';
import {useTemporaryReport} from './use-temporary-report';
import {NovaHistoryMenu} from './nova-history-menu';
import {NovaHistoryBadge,NovaHistoricalReadout,useHistoricalPeriod} from './nova-history-readout';
import reportStyles from './nova-preview-sections.module.css';
import styles from './nova-subpage-header.module.css';
import {testingReadoutKey} from '@/lib/testing-readout-contract';
import {resolveTestingPeriod,testingLatestCompleteDate} from '@/lib/testing-period';
import {testingSnapshotInput} from '@/lib/testing-snapshot-watch';
import {useReadoutVersion} from './use-readout-version';

type Props={section?:string;title:string;redditDateFilter:boolean;showReportingPeriod:boolean;backHref?:string;backLabel:string;overviewMetrics?:OverviewHeadlineMetrics;sharePeriod?:{start:string;end:string};headerOnly?:boolean;pathOverride?:string;navigationPending?:boolean};

export function NovaSubpageHeaderGate(props:Props&{children:ReactNode}){
 return <><NovaSubpageHeader {...props}/>{!props.headerOnly&&<NovaChannelReport overviewMetrics={props.overviewMetrics}/>}</>;
}

export function NovaSubpageHeader({section,title,redditDateFilter,showReportingPeriod,backHref,backLabel,sharePeriod,pathOverride,navigationPending=false}:Props){
 const query=useSearchParams(),currentPath=usePathname(),pathname=pathOverride??currentPath,router=useRouter(),chat=useTestingPageAiScope();
 const {language}=useSiteLanguage(),zh=language==='zh',streamedPeriod=useChannelReportPeriod(),actualPeriod=sharePeriod??streamedPeriod;
 const [pending,startTransition]=useTransition();
 const {start,end,setStart,setEnd,customDraft,setCustomDraft}=useNovaPeriodDraft(query.get('period'),query.get('start'),query.get('end'));
 const social=pathname==='/bluevua/testing/social';
 const options=social?[['lifetime','Lifetime'] as const,...novaReportingPeriods]:redditDateFilter?[[redditSinceStartPreset,redditSinceStartLabel] as const,...novaReportingPeriods]:novaReportingPeriods;
 const requested=query.get('period');
 const selected=customDraft?'custom':options.some(([value])=>value===requested)?requested!:(social?'lifetime':redditDateFilter?redditSinceStartPreset:'lastWeek');
 const update=(period:string,range?:{start:string;end:string})=>{
  if(pending)return;
  const next=new URLSearchParams(query.toString());next.set('period',period);next.delete('history');
  if(period==='custom'&&range){next.set('start',range.start);next.set('end',range.end);}else{next.delete('start');next.delete('end');}
  if(next.toString()!==query.toString())startTransition(()=>router.replace(`${pathname}?${next}`,{scroll:false}));
 };
 const overviewQuery=new URLSearchParams();
 for(const key of ['period','start','end','compare','compareStart','compareEnd','history']){const value=query.get(key);if(value)overviewQuery.set(key,value);}
 return <header data-testing-header className={styles.header}>
  <div className={styles.identity}>
   <div className={styles.historyTitleRow}><h1>{zh&&title==='Content testing overview'?'内容测试总览':title}</h1><NovaHistoryBadge/></div>
   {section&&<div className={styles.backLinks} inert={navigationPending}>{backHref&&<NovaButton asChild variant="outline"><Link href={backHref}><ArrowLeft aria-hidden="true"/>{backLabel}</Link></NovaButton>}<NovaButton asChild variant="ghost"><Link href={`/bluevua/testing?${overviewQuery}`}><LayoutDashboard aria-hidden="true"/>{zh?'返回总览':'Back to overview'}</Link></NovaButton></div>}
  </div>
  <div className={styles.controls} inert={navigationPending}>
   {showReportingPeriod&&<TestingComparisonControls reportingRange={actualPeriod}><label htmlFor="nova-subpage-period">{zh?'报告周期':'Reporting period'}</label><NovaReportingPeriodSelect id="nova-subpage-period" ariaLabel={zh?'测试报告周期':'Testing reporting period'} value={selected} options={options} disabled={pending} onValueChange={value=>{if(value==='custom')setCustomDraft(true);else{setCustomDraft(false);update(value);}}}/>{selected==='custom'&&<NovaReportingPeriodCustom zh={zh} start={start} end={end} disabled={pending} onApply={range=>{const next={start:range.start.toString(),end:range.end.toString()};setStart(next.start);setEnd(next.end);update('custom',next);}}/>}</TestingComparisonControls>}
   <NovaHistoryMenu pageTitle={title}/><NovaShareButton disabled={pending} freezePeriod={showReportingPeriod} period={actualPeriod}/><NovaAskAiButton onClick={()=>chat.isOpen?chat.close():chat.open()} aria-controls="testing-ai-panel" aria-expanded={chat.isOpen}>{zh?'询问 AI':'Ask AI'}</NovaAskAiButton>
  </div>
 </header>;
}

type Preview={disabled:true}|{disabled?:false;manifest:PromptPreviewManifest;reports:PromptPreviewReport[];status:{status?:string}};
function Question({expanded,detailsId,bottomId}:{expanded:boolean;detailsId:string;bottomId:string}){
 const chat=useTestingPageAiScope();
 return <NovaInsightQuestion scope="channel" expanded={expanded} detailsId={detailsId} bottomId={bottomId} canAsk={chat.canAsk} ask={chat.ask} open={chat.open}/>;
}

export function NovaChannelReport(props:{overviewMetrics?:OverviewHeadlineMetrics}){const history=useHistoricalPeriod();return history?<NovaHistoricalReadout/>:<CurrentNovaChannelReport {...props}/>;}

function CurrentNovaChannelReport({overviewMetrics}:{overviewMetrics?:OverviewHeadlineMetrics}){
 const currentReport=usePmaxPresentation();
 const {language}=useSiteLanguage(),pathname=usePathname(),query=useSearchParams(),baseId=previewReportForPath(pathname);
 const selectedPeriod=resolveTestingPeriod(testingLatestCompleteDate(),testingSnapshotInput('meta',query.get('period')??'lastWeek',query.get('start'),query.get('end')) as Parameters<typeof resolveTestingPeriod>[1]);
 const socialLifetime=baseId==='social-media'&&(!query.get('period')||query.get('period')==='lifetime');
 const temporary=useTemporaryReport(baseId??'', '',selectedPeriod.start,selectedPeriod.end),readable=currentReport??(socialLifetime?null:temporary);
 const match=useMatchedReport(baseId,selectedPeriod.start,selectedPeriod.end,language,!!baseId&&!socialLifetime&&!(baseId==='reddit'&&(!query.get('period')||query.get('period')==='sinceSep24')));
 const [previewState,setPreview]=useState<{key:string;value:Preview}|null>(null),[expandedKey,setExpandedKey]=useState<string|null>(null);
 const [failedKey,setFailedKey]=useState<string|null>(null),[attempt,setAttempt]=useState(0);
 const requestKey=`${language}:${pathname}:${query.toString()}`;
 const preview=previewState?.key===requestKey?previewState.value:null;
 const presetForReadout=query.get('period')??'lastWeek';
 const labels:Record<string,string>={lastWeek:'Last Week (Tue–Mon)',wtd:'Week-to-date',mtd:'Month-to-date'};
 const periodKey=testingReadoutKey({label:labels[presetForReadout]??'Custom',...resolveTestingPeriod(testingLatestCompleteDate(),testingSnapshotInput('meta',presetForReadout,query.get('start'),query.get('end')) as Parameters<typeof resolveTestingPeriod>[1])});
 const version=useReadoutVersion(baseId?[periodKey,'period:reddit-lifetime','period:social-lifetime']:[],language);
 const contentId=useId(),bottomId=useId(),buttonRef=useRef<HTMLButtonElement>(null),collapseY=useRef<number|null>(null);
 useEffect(()=>{
  if(!baseId||readable||(baseId==='social-media'&&!socialLifetime))return;
  let cancelled=false;
  const load=async()=>{try{const params=new URLSearchParams({...Object.fromEntries(query.entries()),language});if(version.expected)params.set('expected',version.expected);const data=await fetchTestingReadoutJson<Preview>(`/api/testing/preview?${params}`);if(cancelled)return;setFailedKey(null);setPreview({key:requestKey,value:data});}catch{if(!cancelled)setFailedKey(requestKey);}};
  void load();return()=>{cancelled=true;};
 },[baseId,language,query,requestKey,version.revision,version.expected,readable,attempt,socialLifetime]);
 const key=readable&&baseId?`${readable.run_id}:${baseId}`:preview&&!preview.disabled&&baseId?`${preview.manifest.run_id}:${baseId}`:null,expanded=!!key&&expandedKey===key;
 useLayoutEffect(()=>{if(expanded||collapseY.current===null)return;const y=collapseY.current;collapseY.current=null;const button=buttonRef.current;if(!button)return;const rect=button.getBoundingClientRect();scrollTestingContentBy(button,rect.top+rect.height/2-y);button.focus({preventScroll:true});},[expanded]);
 const hide=(event:MouseEvent<HTMLButtonElement>)=>{const rect=event.currentTarget.getBoundingClientRect();collapseY.current=event.clientY>0?event.clientY:rect.top+rect.height/2;setExpandedKey(null);};
 if(readable&&baseId){
  const zh=language==='zh';
  return <NovaCard className={reportStyles.readout}><InsightPresentation report={readable} scope="channel" header summaryOnly embedded actions={<div className={reportStyles.readoutActions} style={{marginTop:'1rem'}}><NovaButton data-review-reveal="analysis" ref={buttonRef} variant="outline" aria-expanded={expanded} aria-controls={contentId} onClick={()=>setExpandedKey(expanded?null:key)}>{expanded?(zh?'收起完整分析':'Hide full analysis'):(zh?'查看完整分析':'View full analysis')}{expanded?<ChevronUp/>:<ChevronDown/>}</NovaButton>{expanded&&insightPresentationGroups(readable.presentation,'channel').map((block,index)=><NovaButton key={block.id} variant="ghost" size="sm" onClick={()=>document.getElementById(`${contentId}-${index}`)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})}>{block.title}</NovaButton>)}<Question expanded={expanded} detailsId={contentId} bottomId={bottomId}/></div>}/>{expanded&&<div id={contentId} className={reportStyles.readoutDetails}><InsightPresentation report={readable} scope="channel" embedded anchorPrefix={contentId}/><div className={reportStyles.readoutBottom}><NovaButton variant="outline" aria-expanded aria-controls={contentId} onClick={hide}>{zh?'收起完整分析':'Hide full analysis'}<ChevronUp/></NovaButton><div id={bottomId} className={reportStyles.questionBottom}/></div></div>}</NovaCard>;
 }

 if(socialLifetime&&(!preview||preview.disabled||!preview.reports.some(item=>item.report_id==='social-media'&&item.scope==='lifetime')))return <NovaCard className={reportStyles.readout}><div className={reportStyles.readoutBody}><div className={reportStyles.readoutHeading}><Sparkles aria-hidden="true"/><h2>{testingAnalysisTitle(baseId!,language)}</h2><span>{language==='zh'?'全周期':'Lifetime'}</span></div><p role="status">{language==='zh'?'暂无全周期分析。':'Lifetime analysis is not available yet.'}</p></div></NovaCard>;
 if(baseId&&!readable&&(match.checking||match.error))return <NovaCard className={reportStyles.loading}><p role={match.error?'alert':'status'}>{match.error?(language==='zh'?'无法核对已保存报告。':'Could not check saved reports.'):(language==='zh'?'正在核对已保存报告…':'Checking saved reports…')}</p></NovaCard>;
 if(baseId==='social-media'&&!socialLifetime&&!readable)return <NovaCard className={reportStyles.loading}><p>{language==='zh'?'此时间区间暂无可用分析。':'No analysis is available for this period.'}</p><GenerateReadoutButton period={{label:'Custom',...selectedPeriod}} scope={baseId}/></NovaCard>;
 if(baseId&&query.get('compare')&&query.get('compare')!=='previousPeriod'&&!readable)return <NovaCard className={reportStyles.loading}><p>{language==='zh'?'当前对比周期暂无匹配分析。':'No analysis matches this comparison period.'}</p><GenerateReadoutButton period={{label:'Custom',...selectedPeriod}} scope={baseId}/></NovaCard>;
 if(!preview&&baseId&&failedKey===requestKey)return <NovaCard className={reportStyles.loading}><p role="alert">{language==='zh'?'分析加载失败，请重试。':'Analysis could not be loaded. Please retry.'}</p><NovaButton variant="outline" onClick={()=>{setFailedKey(null);setAttempt(value=>value+1);}}>{language==='zh'?'重试':'Retry'}</NovaButton></NovaCard>;
 if(preview?.disabled&&baseId)return <NovaCard className={reportStyles.loading}><p>{language==='zh'?'此时间区间暂无可用分析。':'No analysis is available for this period.'}</p><GenerateReadoutButton period={{label:'Custom',...selectedPeriod}} scope={baseId}/></NovaCard>;
 if(!preview||preview.disabled||!baseId||(preview.manifest.language==='en')!==(language==='en'))return null;
 const zh=language==='zh',preset=query.get('period'),lifetime=baseId==='social-media'||(baseId==='reddit'&&(!preset||preset===redditSinceStartPreset));
 const reportId=baseId==='reddit'&&lifetime?'reddit-lifetime':baseId;
 const supported=lifetime||!preset||preset==='lastWeek'||(query.get('start')===preview.manifest.period.start&&query.get('end')===preview.manifest.period.end);
 if(!supported&&!preview.manifest.run_id.startsWith('published-'))return <NovaCard className={reportStyles.loading}>{zh?'本轮预览使用':'This preview covers'} {preview.manifest.period.start} – {preview.manifest.period.end}{zh?'；请选择 Last Week 查看。':'. Select Last Week to view it.'}</NovaCard>;
 const report=preview.reports.find(item=>item.report_id===reportId&&(baseId!=='social-media'||item.scope==='lifetime'));
 if(!report&&preview.manifest.run_id.startsWith('published-'))return null;
 const assetChannel=baseId==='social-media'?'social':baseId==='reddit-lifetime'?'reddit':baseId==='overview'?undefined:baseId;
 const reportHeading=testingAnalysisTitle(baseId,language);
 const summary=report&&baseId==='overview'&&overviewMetrics?liveOverviewExecutiveSummary(report.executive_summary,overviewMetrics,language):report?.executive_summary;
 return <NovaCard className={reportStyles.readout}><div className={reportStyles.readoutBody}>
  <div className={reportStyles.readoutHeading}><Sparkles aria-hidden="true"/><h2>{reportHeading}</h2><span>{lifetime?'Lifetime':`${preview.manifest.period.start} – ${preview.manifest.period.end}`}</span></div>
  {report?<><div className={reportStyles.readoutSummary}><InsightMarkdown channel={assetChannel}>{summary??""}</InsightMarkdown></div><div className={reportStyles.readoutActions}><NovaButton data-review-reveal="analysis" ref={buttonRef} variant="outline" aria-expanded={expanded} aria-controls={contentId} onClick={()=>setExpandedKey(expanded?null:key)}>{expanded?(zh?'收起完整分析':'Hide full analysis'):(zh?'查看完整分析':'View full analysis')}{expanded?<ChevronUp/>:<ChevronDown/>}</NovaButton>{expanded&&report.sections.map((section,index)=><NovaButton key={section.title} variant="ghost" size="sm" onClick={()=>document.getElementById(`${contentId}-${index}`)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})}>{section.title}</NovaButton>)}<Question expanded={expanded} detailsId={contentId} bottomId={bottomId}/></div></>:<p role="status" className={reportStyles.loading}>{preview.status.status==='completed'?(zh?'此时间区间暂无可用分析。':'Analysis is not available for this reporting period.'):(zh?'正在获取分析…':'Fetching analysis…')}</p>}
 </div>{report&&expanded&&<div id={contentId} className={reportStyles.readoutDetails}>{report.sections.map((section,index)=><section key={section.title} id={`${contentId}-${index}`} className={reportStyles.readoutDetail}><h3><InsightText channel={assetChannel}>{section.title}</InsightText></h3><div className={reportStyles.markdown}><InsightMarkdown channel={assetChannel}>{conclusionOnlyMarkdown(section.markdown)}</InsightMarkdown></div></section>)}<div className={reportStyles.readoutBottom}><NovaButton variant="outline" aria-expanded aria-controls={contentId} onClick={hide}>{zh?'收起完整分析':'Hide full analysis'}<ChevronUp/></NovaButton><div id={bottomId} className={reportStyles.questionBottom}/></div></div>}</NovaCard>;
}
