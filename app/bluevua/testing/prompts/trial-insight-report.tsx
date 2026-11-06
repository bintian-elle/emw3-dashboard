'use client';
import {useId,useState} from 'react';
import type {PmaxReadableReport} from '@/lib/testing-insight-presentation';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {InsightPresentation,VisualInsightSummary} from '../insight-presentation';
import {NovaButton,NovaCard} from '../nova-preview-ui';
import {ReadoutQuestion} from '../readout-question';
import {useTestingAiScope} from '../testing-ai';
export function TrialInsightReport({report,channel}:{report:PmaxReadableReport;channel:string}){
 return <div className="grid min-w-0 gap-5"><TrialInsightScope report={report} channel={channel} scope="channel"/>{report.analysis.campaigns.map(campaign=><TrialInsightScope key={campaign.test_id} report={report} channel={channel} scope={campaign.test_id}/>)}</div>;
}
function TrialInsightScope({report,channel,scope}:{report:PmaxReadableReport;channel:string;scope:string}){
 const {language}=useSiteLanguage(),zh=language==='zh',id=useId(),[expanded,setExpanded]=useState(false),macro=scope==='channel';
 const ai=useTestingAiScope(channel,macro?undefined:scope,{label:'Custom',...report.period},JSON.stringify({page:'Prompt trial',run_id:report.run_id,scope,analysis:report.analysis,presentation:report.presentation}));
 const campaign=report.analysis.campaigns.find(c=>c.test_id===scope);
 const actions=<div className="flex min-w-0 flex-wrap items-stretch gap-2"><NovaButton variant="outline" aria-expanded={expanded} aria-controls={id} onClick={()=>setExpanded(v=>!v)}>{expanded?(zh?'收起分析':'Hide analysis'):macro?(zh?'查看完整分析':'View full analysis'):(zh?'查看详细分析':'View detailed analysis')}</NovaButton>{expanded&&report.presentation.sections?.map((section,index)=><NovaButton key={section.id} variant="ghost" onClick={()=>document.getElementById(`${id}-${index}`)?.scrollIntoView({behavior:'instant',block:'start'})}>{section.title}</NovaButton>)}<ReadoutQuestion onAsk={ai.ask} onOpen={ai.open} canAsk={ai.canAsk} overview={macro} channelOverview={macro} expanded={expanded} detailsId={id} bottomId={`${id}-bottom`}/></div>;
 return <NovaCard className="min-w-0 overflow-hidden">{macro?<InsightPresentation report={report} scope="channel" header summaryOnly embedded actions={actions}/>:<div className="grid gap-3 p-5"><h2 className="break-words text-lg font-semibold">{scope}</h2>{campaign?.summary_html?.trim()?<VisualInsightSummary html={campaign.summary_html} report={report} scope={scope}/>:<p className="text-sm leading-7">{campaign?.summary}</p>}{actions}</div>}{expanded&&<div id={id} className="min-w-0 border-t border-border-table"><InsightPresentation report={report} scope={scope} embedded anchorPrefix={id}/><div className="flex gap-3 p-5"><NovaButton variant="outline" onClick={()=>setExpanded(false)}>{zh?'收起分析':'Hide analysis'}</NovaButton><div id={`${id}-bottom`} className="min-h-10 flex-1"/></div></div>}</NovaCard>;
}
