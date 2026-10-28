'use client';

import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {conclusionOnlyMarkdown} from '@/lib/testing-prompt-presentation';
import {liveOverviewExecutiveSummary} from '@/lib/testing-readout-live-overview';
import type {OverviewHeadlineMetrics} from '@/lib/overview-headline-metrics';
import {useEffect,useId,useState} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import {RiArrowDownSLine,RiArrowUpSLine,RiSparkling2Line} from '@remixicon/react';
import {Button} from '@/components/base/buttons/button';
import {Chip} from '@/components/base/badges/chip';
import {MessageResponse} from '@/components/ai-elements/message';
import {previewReportForPath,type PromptPreviewManifest,type PromptPreviewReport} from '@/lib/testing-prompt-preview';
import {useTestingPageAiScope} from './testing-ai';
import {ReadoutQuestion} from './readout-question';

export function PromptPreviewMarkdown({content}:{content:string}){
 return <MessageResponse isAnimating={false} controls={{table:false}} tableMaxHeight={0} className="min-w-0 text-body-regular text-text-secondary [&_a]:text-accent-700 [&_h1]:text-headline-semibold! [&_h1]:text-text-primary [&_h2]:text-headline-semibold! [&_h2]:text-text-primary [&_h3]:text-headline-semibold! [&_h3]:text-text-primary [&_strong]:text-text-primary [&_th]:text-caption-1-semibold [&_th]:text-text-secondary [&_td]:text-body-regular [&_td]:text-text-primary [&_table]:w-auto! [&_table]:max-w-full [&_table]:divide-separator-border [&_thead]:bg-background-secondary-default! [&_tbody]:divide-separator-border [&_th]:px-3 [&_td]:px-3 [&_td]:align-top [&_td]:max-w-64 [&_td]:whitespace-normal [&_[data-streamdown=table-wrapper]]:rounded-none! [&_[data-streamdown=table-wrapper]]:border-0! [&_[data-streamdown=table-wrapper]]:bg-transparent! [&_[data-streamdown=table-wrapper]]:p-0! [&_[data-streamdown=table-wrapper]>div]:rounded-none! [&_[data-streamdown=table-wrapper]>div]:border-0! [&_[data-streamdown=table-wrapper]>div]:bg-transparent! [&_th]:border-border-table [&_td]:border-border-table [&_code]:bg-background-tertiary-default [&_code]:text-text-primary">{conclusionOnlyMarkdown(content)}</MessageResponse>;
}
type Preview={manifest:PromptPreviewManifest;reports:PromptPreviewReport[];status:{status?:string;current?:string}};
export function TestingPromptPreviewReport({overviewMetrics}:{overviewMetrics?:OverviewHeadlineMetrics}){
 const {language}=useSiteLanguage();
 const pathname=usePathname(),query=useSearchParams(),baseId=previewReportForPath(pathname);
 const [preview,setPreview]=useState<Preview|null>(null),[expandedKey,setExpandedKey]=useState<string|null>(null);
 const contentId=useId(),questionBottomId=useId(),chat=useTestingPageAiScope();
 useEffect(()=>{
  if(!baseId)return;
  let cancelled=false,timer:ReturnType<typeof setTimeout>|undefined;
  const load=async()=>{let poll=true;try{const response=await fetch(`/api/testing/preview?${new URLSearchParams({...Object.fromEntries(query.entries()),language})}`,{cache:'no-store'});if(response.ok){const data=await response.json() as Preview&{disabled?:boolean};if(cancelled)return;if(data.disabled)poll=false;else{setPreview(data);poll=data.status.status!=='completed';}}}catch{/* Keep the current report and retry a transient local file/network read. */}finally{if(!cancelled&&poll)timer=setTimeout(()=>{void load();},20000);}};
  void load();return()=>{cancelled=true;if(timer)clearTimeout(timer);};
 },[baseId,language,query]);
 if(!preview||!baseId||(preview.manifest.language==='en')!==(language==='en'))return null;
 const english=preview.manifest.language==='en';
 const preset=query.get('period');
 const lifetime=baseId==='social-media'||(baseId==='reddit'&&(!preset||preset==='sinceSep24'));
 const reportId=baseId==='reddit'&&lifetime?'reddit-lifetime':baseId;
 const supported=lifetime||!preset||preset==='lastWeek'||(query.get('start')===preview.manifest.period.start&&query.get('end')===preview.manifest.period.end);
 if(!supported&&!preview.manifest.run_id.startsWith('published-'))return <p className="mb-6 rounded-xl border border-border-button-default bg-background-primary-default p-4 text-body-regular text-text-secondary">{english?'This preview covers':'本轮预览使用'} {preview.manifest.period.start} – {preview.manifest.period.end}{english?'. Select Last Week to view it.':'；请选择 Last Week 查看。'}</p>;
 const report=preview.reports.find(item=>item.report_id===reportId);
 if(!report&&preview.manifest.run_id.startsWith('published-'))return null;
 const key=`${preview.manifest.run_id}:${reportId}`,expanded=expandedKey===key;
 const summary=report&&baseId==='overview'&&overviewMetrics?liveOverviewExecutiveSummary(report.executive_summary,overviewMetrics,english?'en':'zh'):report?.executive_summary;
 return <section className="mb-6 min-w-0 overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card" aria-label={english?'New prompt English analysis preview':'新 Prompt 中文分析预览'}>
  <div className="flex flex-col gap-4 p-5 sm:p-6">
   <div className="flex flex-wrap items-center gap-3"><RiSparkling2Line className="size-5 text-foreground-icon-primary" aria-hidden/><h2 className="text-headline-medium text-text-primary">{report?.title??(english?'Channel analysis':'渠道分析')}</h2>{!preview.manifest.run_id.startsWith('published-')&&<Chip variant="caption" color="soft">{english?'Local English preview':'本地中文预览'}</Chip>}<span className="text-caption-1-regular text-text-tertiary">{lifetime?'Lifetime':`${preview.manifest.period.start} – ${preview.manifest.period.end}`}</span></div>
   {report?<><div className="rounded-2xl border border-status-blue-background bg-status-blue-background/40 p-4">{report.sections.some(section=>['各维度的关键对比','Key comparisons across dimensions'].includes(section.title))&&<p className="mb-2 text-caption-1-semibold text-accent-700">{english?'Key conclusion':'核心结论'}</p>}<p className="text-body-medium text-text-primary">{summary}</p></div><div className="flex flex-wrap items-center gap-2"><Button variant="secondary" size="small" aria-expanded={expanded} aria-controls={contentId} trailingIcon={expanded?RiArrowUpSLine:RiArrowDownSLine} onClick={()=>setExpandedKey(expanded?null:key)}>{expanded?(english?'Hide full analysis':'收起完整分析'):(english?'View full analysis':'查看完整分析')}</Button>{expanded&&report.sections.map((section,index)=><Button key={section.title} variant="ghost" size="small" onClick={()=>document.getElementById(`${contentId}-${index}`)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})}>{section.title}</Button>)}<ReadoutQuestion onAsk={chat.ask} onOpen={chat.open} canAsk={chat.canAsk} overview channelOverview={baseId!=='overview'} expanded={expanded} detailsId={contentId} bottomId={questionBottomId}/></div></>:<p role="status" className="text-body-regular text-text-secondary">{english?'Analysis will appear here when ready.':baseId==='overview'?'各渠道分析完成后，AI 将汇总生成 Overview。':'AI 正在按新 Prompt 逐渠道生成，这个渠道完成后会自动显示。'}</p>}
  </div>
  {report&&expanded&&<div id={contentId} className="flex min-w-0 flex-col divide-y divide-separator-border border-t border-border-table">{report.sections.map((section,index)=><section key={section.title} id={`${contentId}-${index}`} className="min-w-0 scroll-mt-40 p-5 sm:p-6"><h3 className="mb-5 text-title-2-semibold text-accent-700">{section.title}</h3><div className="min-w-0 overflow-x-auto"><PromptPreviewMarkdown content={section.markdown}/></div></section>)}<div className="flex flex-wrap items-center gap-3 p-5"><Button variant="secondary" size="small" trailingIcon={RiArrowUpSLine} onClick={()=>{setExpandedKey(null);document.getElementById(contentId)?.closest('section[aria-label]')?.scrollIntoView({behavior:'instant',block:'start'});}}>{english?'Hide full analysis':'收起完整分析'}</Button><div id={questionBottomId} className="min-h-10 min-w-64 flex-1"/></div></div>}
 </section>;
}
