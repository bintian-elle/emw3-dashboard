'use client';

import {type MouseEvent,type ReactNode,type RefObject} from 'react';
import {ChevronDown,ChevronUp,Sparkles} from 'lucide-react';
import {usePmaxPresentation,useConcludedPresentation,InsightPresentation,VisualInsightSummary} from './insight-presentation';
import {useMatchedReport} from './use-matched-report';
import {useTemporaryReport} from './use-temporary-report';
import {useHistoricalPeriod,useHistoricalReport} from './nova-history-readout';
import {InsightMarkdown} from './insight-assets';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {conclusionOnlyMarkdown} from '@/lib/testing-prompt-presentation';
import {cleanTestingReadoutCopy} from '@/lib/testing-readout-copy';
import {insightPresentationGroups} from '@/lib/testing-insight-presentation';
import {campaignNavigation} from '@/lib/testing-campaign-navigation';
import {testingReadoutKey,type CachedTestReadout,type CachedPeriodReadout,type ReadoutPeriod} from '@/lib/testing-readout-contract';
import type {TestingFrameworkKey,ReadoutMetric} from '@/lib/testing-framework';
import {NovaButton,NovaCard} from './nova-preview-ui';
import {NovaInsightQuestion} from './nova-insight-question';
import {GenerateReadoutButton} from './generate-readout-button';
import shared from './nova-preview-sections.module.css';
import styles from './nova-test-readout.module.css';
import {testingAnalysisTitle} from '@/lib/testing-analysis-title';

const channelNames:Record<TestingFrameworkKey,string>={overview:'Overview','google-search':'Google Search','google-pmax':'Google PMAX','google-demand-gen':'Demand Gen',meta:'Meta','reddit-awareness':'Reddit','reddit-conversion':'Reddit',social:'Social Media',edm:'EDM'};
type Props={
 channel?:TestingFrameworkKey;testIdentity?:string;period?:ReadoutPeriod|null;standalone:boolean;campaignId:string;children?:ReactNode;
 summary?:string|null;test?:CachedTestReadout;overview?:CachedPeriodReadout['overview'];socialEdmBrief:string[];deltas:ReadoutMetric[];
 loading:boolean;loadError?:boolean;onRetry?:()=>void;translationPending:boolean;translationError:boolean;
 ready:boolean;canAsk:boolean;ask:(question:string)=>Promise<boolean>;open:()=>void;
 expanded:boolean;setExpanded:(value:boolean)=>void;toggleRef:RefObject<HTMLButtonElement|null>;detailsId:string;bottomId:string;
 preserveCollapsePosition:(event:MouseEvent<HTMLButtonElement>)=>void;
};
function Text({text,channel}:{text:string;channel?:string}){
 return <div className={styles.text}><InsightMarkdown channel={channel}>{cleanTestingReadoutCopy(text)}</InsightMarkdown></div>;
}
function List({title,items,channel}:{title:string;items?:string[];channel?:string}){
 if(!items?.length)return null;
 return <section className={styles.detailGroup}><h3>{title}</h3><ul>{items.map((item,index)=><li key={index}><Text text={item} channel={channel}/></li>)}</ul></section>;
}
/** Presentation only: readout selection and caching stay in the shared TestReadout. */
export function NovaTestReadout({channel,testIdentity,period,standalone,campaignId,children,summary,test,overview,socialEdmBrief,deltas,loading,loadError,onRetry,translationPending,translationError,ready:cacheReady,canAsk,ask,open,expanded,setExpanded,toggleRef,detailsId,bottomId,preserveCollapsePosition}:Props){
 const {language}=useSiteLanguage(),zh=language==='zh',isOverview=channel==='overview'&&testIdentity==='overview';
 const concluded=useConcludedPresentation(language);
 const currentReport=usePmaxPresentation(),history=useHistoricalPeriod(),historicalReport=useHistoricalReport();
 const temporary=useTemporaryReport(channel??'overview',isOverview?'':testIdentity??'',period?.concludedTestId?undefined:period?.start,period?.concludedTestId?undefined:period?.end);
 const scope=channel==='social'?'social-media':channel==='reddit-awareness'||channel==='reddit-conversion'?'reddit':channel??'overview';
 const match=useMatchedReport(scope,period?.start??'',period?.end??'',language,!!period?.start&&!!period?.end&&!history&&!period.concludedTestId&&scope!=='social-media');
 const saved=history?historicalReport?.visual:currentReport;
 const readable=saved?.analysis.campaigns.some(item=>item.test_id===testIdentity)?saved:temporary??saved,trial=readable?.analysis.campaigns.find(c=>c.test_id===testIdentity);
 const navigation=concluded?insightPresentationGroups(concluded.presentation,'channel').map((group,index)=>({title:group.title,target:`${detailsId}-${index}`})):
  trial&&readable&&testIdentity?campaignNavigation(readable.presentation,testIdentity,detailsId):[];
 const ready=Boolean(concluded)||(history?Boolean(trial):cacheReady||Boolean(trial));
 summary=concluded?.presentation.summary??(history?trial?.summary??null:trial?.summary??summary);
 const t=(english:string,chinese:string)=>zh?chinese:english;
 const collapsible=Boolean(children&&!standalone&&testIdentity);
 const noData=match.error?t('Could not check saved reports.','无法核对已保存报告。'):match.checking?t('Checking saved reports…','正在核对已保存报告…'):loadError?t('Analysis could not be loaded. Please retry.','分析加载失败，请重试。'):loading?t('Fetching analysis…','正在获取分析…'):t('Analysis is not available for this reporting period.','此时间区间暂无可用分析。');
 const toggle=<NovaButton data-review-reveal="analysis" ref={toggleRef} variant="outline" disabled={!ready} aria-expanded={expanded} aria-controls={detailsId} onClick={()=>setExpanded(!expanded)}>{expanded?t('Hide details','收起详情'):(isOverview?t('View all insights and data coverage','查看全部洞察与数据覆盖'):t('View detailed analysis','查看详细分析'))}{expanded?<ChevronUp/>:<ChevronDown/>}</NovaButton>;
 const question=<NovaInsightQuestion scope="test" expanded={expanded} detailsId={detailsId} bottomId={bottomId} canAsk={canAsk} ask={ask} open={open}/>;
 const summaryBlock=<div className={styles.summary}><div className={styles.summaryTitle}><Sparkles aria-hidden="true"/><h2>{testingAnalysisTitle(channel,language,isOverview?undefined:testIdentity)}</h2></div>{concluded?.presentation.summary_html?.trim()?<VisualInsightSummary html={concluded.presentation.summary_html} report={concluded} scope="channel"/>:trial?.summary_html?.trim()&&readable?<VisualInsightSummary html={trial.summary_html} report={readable} scope={testIdentity!}/>:summary?<Text text={summary} channel={channel}/>:<div className={styles.muted} role={loading?'status':undefined}>{noData} {loadError&&onRetry?<NovaButton variant="ghost" size="sm" onClick={onRetry}>{t("Retry","重试")}</NovaButton>:!loading&&!history&&!match.checking&&!match.error&&<GenerateReadoutButton period={period} scope={channel??"overview"} campaign={isOverview?"":testIdentity??""}/>}</div>}{zh&&!concluded&&translationPending&&<p className={styles.muted} role="status">中文翻译正在准备，暂显示英文分析。</p>}{zh&&!concluded&&translationError&&<p className={styles.muted} role="status">中文翻译暂不可用，暂显示英文分析。</p>}</div>;
 const details=<div id={detailsId} hidden={!expanded} className={styles.details}>
  {concluded?expanded&&<InsightPresentation report={concluded} scope="channel" embedded anchorPrefix={detailsId}/>:trial&&readable?expanded&&<><InsightPresentation report={readable} scope={testIdentity!} anchorPrefix={detailsId}/>{trial.detail_markdown&&<details className={styles.detailGroup}><summary>查看完整分析依据</summary><InsightMarkdown channel={channel}>{trial.detail_markdown}</InsightMarkdown></details>}</>:test?.preview_sections?test.preview_sections.map((section,index)=><section key={index} className={styles.detailGroup}>{section.title&&<h3>{section.title}</h3>}<div className={shared.markdown}><InsightMarkdown channel={channel}>{conclusionOnlyMarkdown(section.markdown)}</InsightMarkdown></div></section>):<>
   {period&&!testingReadoutKey(period)&&<p className={styles.muted}>{t('Select Last Week, Week-to-date or Month-to-date to view analysis.','选择上周、本周至今或本月至今，查看分析。')}</p>}
   {!summary&&<p className={styles.muted} role={loading?'status':undefined}>{noData}</p>}
   {test?.recommended_action&&<section className={styles.detailGroup}><h3>{t('Recommended next step','下一步建议')}</h3><Text text={test.recommended_action} channel={channel}/></section>}
   {overview&&<><List channel={channel} title={t('Optimization priorities','优化优先事项')} items={overview.recommended_actions}/><List channel={channel} title={t('Social Media & EDM','社交媒体与 EDM')} items={socialEdmBrief}/><List channel={channel} title={t('Key insights','关键洞察')} items={overview.key_findings}/><List channel={channel} title={t('Data coverage','数据覆盖')} items={overview.data_gaps}/></>}
   {test?.delta&&<section className={styles.detailGroup}><h3>{t('Delta','差异')}{test.delta.comparison_label?` · ${test.delta.comparison_label}`:''}{test.confidence?` · ${test.confidence.replaceAll('_',' ')}`:''}</h3>{deltas.length>0&&<dl className={styles.delta}>{deltas.map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd>{item.detail&&<p>{item.detail}</p>}</div>)}</dl>}</section>}
   {channel!=='overview'&&<><List channel={channel} title={t('Performance analysis','表现分析')} items={test?.asset_insights}/><List channel={channel} title={t('Evidence and sources','依据与来源')} items={test?.evidence?.filter(value=>!value.startsWith('[FRAMEWORK]'))}/><List channel={channel} title={t('Data coverage','数据覆盖')} items={test?.data_gaps}/></>}
  </>}
  {expanded&&<div className={styles.actions}><NovaButton variant="outline" aria-controls={detailsId} aria-expanded onClick={event=>{preserveCollapsePosition(event);setExpanded(false);}}>{t('Hide details','收起详情')}<ChevronUp/></NovaButton><div id={bottomId} className={shared.questionBottom}/></div>}
 </div>;
 if(!children&&!test&&!summary)return null;
 const report=<><div className={styles.actions}>{toggle}{expanded&&navigation.map(item=><NovaButton key={item.target} type="button" variant="ghost" size="sm" aria-controls={item.target} onClick={()=>{const target=document.getElementById(item.target);if(!target)return;const headerBottom=document.querySelector('[data-testing-header]')?.getBoundingClientRect().bottom??0;target.style.scrollMarginTop=`${Math.ceil(Math.max(0,headerBottom)+16)}px`;target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}}>{item.title}</NovaButton>)}{question}</div>{details}</>;
 if(collapsible)return <div id={campaignId} data-campaign-anchor data-campaign-name={testIdentity} data-campaign-channel={channel?channelNames[channel]:'Google Search'} tabIndex={-1} className={styles.campaign}>{summaryBlock}<section aria-label="Test performance data">{children}</section>{report}</div>;
 return <><NovaCard className={styles.card}>{summaryBlock}{report}</NovaCard>{children&&<section aria-label="Test performance data">{children}</section>}</>;
}
