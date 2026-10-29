'use client';

import {type MouseEvent,type ReactNode,type RefObject} from 'react';
import {ChevronDown,ChevronUp,Sparkles} from 'lucide-react';
import {Streamdown} from 'streamdown';
import {cjk} from '@streamdown/cjk';
import {code} from '@streamdown/code';
import {math} from '@streamdown/math';
import {mermaid} from '@streamdown/mermaid';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {conclusionOnlyMarkdown} from '@/lib/testing-prompt-presentation';
import {cleanTestingReadoutCopy} from '@/lib/testing-readout-copy';
import {testingReadoutKey,type CachedTestReadout,type CachedPeriodReadout,type ReadoutPeriod} from '@/lib/testing-readout-contract';
import type {TestingFrameworkKey,ReadoutMetric} from '@/lib/testing-framework';
import {NovaButton,NovaCard} from './nova-preview-ui';
import {NovaInsightQuestion} from './nova-insight-question';
import shared from './nova-preview-sections.module.css';
import styles from './nova-test-readout.module.css';

const plugins={cjk,code,math,mermaid};
const channelNames:Record<TestingFrameworkKey,string>={overview:'Overview','google-search':'Google Search','google-pmax':'Google PMAX','google-demand-gen':'Demand Gen',meta:'Meta','reddit-awareness':'Reddit','reddit-conversion':'Reddit',social:'Social Media',edm:'EDM'};
type Props={
 channel?:TestingFrameworkKey;testIdentity?:string;period?:ReadoutPeriod|null;standalone:boolean;campaignId:string;children?:ReactNode;
 summary?:string|null;test?:CachedTestReadout;overview?:CachedPeriodReadout['overview'];socialEdmBrief:string[];deltas:ReadoutMetric[];
 loading:boolean;translationPending:boolean;translationError:boolean;
 ready:boolean;canAsk:boolean;ask:(question:string)=>Promise<boolean>;open:()=>void;
 expanded:boolean;setExpanded:(value:boolean)=>void;toggleRef:RefObject<HTMLButtonElement|null>;detailsId:string;bottomId:string;
 preserveCollapsePosition:(event:MouseEvent<HTMLButtonElement>)=>void;
};
function Text({text}:{text:string}){
 const parts=cleanTestingReadoutCopy(text).split(/(https?:\/\/[^\s<>，。；：！？、（）「」《》]+[^\s<>.,;:)\]，。；：！？、（）「」《》])/g);
 return <p className={styles.text}>{parts.map((part,index)=>/^https?:\/\//.test(part)?<a key={index} href={part} target="_blank" rel="noreferrer">{part}</a>:part)}</p>;
}
function List({title,items}:{title:string;items?:string[]}){
 if(!items?.length)return null;
 return <section className={styles.detailGroup}><h3>{title}</h3><ul>{items.map((item,index)=><li key={index}><Text text={item}/></li>)}</ul></section>;
}
/** Presentation only: readout selection and caching stay in the shared TestReadout. */
export function NovaTestReadout({channel,testIdentity,period,standalone,campaignId,children,summary,test,overview,socialEdmBrief,deltas,loading,translationPending,translationError,ready,canAsk,ask,open,expanded,setExpanded,toggleRef,detailsId,bottomId,preserveCollapsePosition}:Props){
 const {language}=useSiteLanguage(),zh=language==='zh',isOverview=channel==='overview'&&testIdentity==='overview';
 const t=(english:string,chinese:string)=>zh?chinese:english;
 const collapsible=Boolean(children&&!standalone&&testIdentity);
 const noData=loading?t('Fetching analysis…','正在获取分析…'):t('Analysis is not available for this reporting period.','此时间区间暂无可用分析。');
 const toggle=<NovaButton ref={toggleRef} variant="outline" disabled={!ready} aria-expanded={expanded} aria-controls={detailsId} onClick={()=>setExpanded(!expanded)}>{expanded?t('Hide details','收起详情'):(isOverview?t('View all insights and data coverage','查看全部洞察与数据覆盖'):t('View detailed analysis','查看详细分析'))}{expanded?<ChevronUp/>:<ChevronDown/>}</NovaButton>;
 const question=<NovaInsightQuestion scope="test" expanded={expanded} detailsId={detailsId} bottomId={bottomId} canAsk={canAsk} ask={ask} open={open}/>;
 const summaryBlock=<div className={styles.summary}><div className={styles.summaryTitle}><Sparkles aria-hidden="true"/><h2>{t('Test summary','测试总结')}</h2></div>{summary?<Text text={summary}/>:<p className={styles.muted} role={loading?'status':undefined}>{noData}</p>}{zh&&translationPending&&<p className={styles.muted} role="status">中文翻译正在准备，暂显示英文分析。</p>}{zh&&translationError&&<p className={styles.muted} role="status">中文翻译暂不可用，暂显示英文分析。</p>}</div>;
 const details=<div id={detailsId} hidden={!expanded} className={styles.details}>
  {test?.preview_sections?test.preview_sections.map((section,index)=><section key={index} className={styles.detailGroup}>{section.title&&<h3>{section.title}</h3>}<div className={shared.markdown}><Streamdown plugins={plugins} isAnimating={false} controls={{table:false}} tableMaxHeight={0}>{conclusionOnlyMarkdown(section.markdown)}</Streamdown></div></section>):<>
   {period&&!testingReadoutKey(period)&&<p className={styles.muted}>{t('Select Last Week, Week-to-date or Month-to-date to view analysis.','选择上周、本周至今或本月至今，查看分析。')}</p>}
   {!summary&&<p className={styles.muted} role={loading?'status':undefined}>{noData}</p>}
   {test?.recommended_action&&<section className={styles.detailGroup}><h3>{t('Recommended next step','下一步建议')}</h3><Text text={test.recommended_action}/></section>}
   {overview&&<><List title={t('Optimization priorities','优化优先事项')} items={overview.recommended_actions}/><List title={t('Social Media & EDM','社交媒体与 EDM')} items={socialEdmBrief}/><List title={t('Key insights','关键洞察')} items={overview.key_findings}/><List title={t('Data coverage','数据覆盖')} items={overview.data_gaps}/></>}
   {test?.delta&&<section className={styles.detailGroup}><h3>{t('Delta','差异')}{test.delta.comparison_label?` · ${test.delta.comparison_label}`:''}{test.confidence?` · ${test.confidence.replaceAll('_',' ')}`:''}</h3>{deltas.length>0&&<dl className={styles.delta}>{deltas.map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd>{item.detail&&<p>{item.detail}</p>}</div>)}</dl>}</section>}
   {channel!=='overview'&&<><List title={t('Performance analysis','表现分析')} items={test?.asset_insights}/><List title={t('Evidence and sources','依据与来源')} items={test?.evidence?.filter(value=>!value.startsWith('[FRAMEWORK]'))}/><List title={t('Data coverage','数据覆盖')} items={test?.data_gaps}/></>}
  </>}
  {expanded&&<div className={styles.actions}><NovaButton variant="outline" aria-controls={detailsId} aria-expanded onClick={event=>{preserveCollapsePosition(event);setExpanded(false);}}>{t('Hide details','收起详情')}<ChevronUp/></NovaButton><div id={bottomId} className={shared.questionBottom}/></div>}
 </div>;
 if(!children&&!test&&!summary)return null;
 const report=<><div className={styles.actions}>{toggle}{question}</div>{details}</>;
 if(collapsible)return <div id={campaignId} data-campaign-anchor data-campaign-name={testIdentity} data-campaign-channel={channel?channelNames[channel]:'Google Search'} tabIndex={-1} className={styles.campaign}>{summaryBlock}<section aria-label="Test performance data">{children}</section>{report}</div>;
 return <><NovaCard className={styles.card}>{summaryBlock}{report}</NovaCard>{children&&<section aria-label="Test performance data">{children}</section>}</>;
}
