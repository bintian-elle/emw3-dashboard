'use client';

import {Suspense} from 'react';
import {usePathname} from 'next/navigation';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {ChevronDown,LoaderCircle,Sparkles} from 'lucide-react';
import type {TestingInventoryChannel} from '@/lib/testing-inventory-model';
import {testingAnalysisTitle} from '@/lib/testing-analysis-title';
import {CampaignStatusChip} from './campaign-status-chip';
import {useTestingInventory} from './testing-inventory-context';
import {NovaAiComposer} from './nova-ai-composer';
import {NovaButton,NovaCard} from './nova-preview-ui';
import {NovaSubpageHeader} from './nova-subpage-header';
import {SocialPostTable} from './social/social-post-table';
import {cachedInstagramPosts} from '@/lib/instagram-posts';
import {activeCampaignsFirst} from '@/lib/testing-campaign-status';
import channelStyles from './channel-content.module.css';
import reportStyles from './nova-preview-sections.module.css';
import testStyles from './nova-test-readout.module.css';
import styles from './channel-route-loading.module.css';

const channels:Record<string,TestingInventoryChannel|'social'>={'Google Search':'google-search','Google PMAX':'google-pmax','Google Demand Gen':'google-demand-gen',Meta:'meta',Reddit:'reddit',EDM:'edm','Social Media':'social'};

function DataStatus(){const {language}=useSiteLanguage();return <div className={styles.status} role="status"><LoaderCircle aria-hidden="true"/>{language==='zh'?'正在加载数据…':'Loading data…'}</div>;}

function CampaignCards({channel}:{channel:TestingInventoryChannel}){
 const inventory=useTestingInventory(),campaigns=inventory.items.filter(item=>item.channelKey===channel),items=channel==='meta'?activeCampaignsFirst(campaigns,item=>item.status):campaigns,{language}=useSiteLanguage(),zh=language==='zh';
 if(!items.length)return <div className={channelStyles.list}><section className={channelStyles.card}><DataStatus/></section></div>;
 const entity=channel==='google-pmax'?'Asset group':channel==='google-demand-gen'||channel==='reddit'?'Ad':channel==='edm'?'Email':'Ad group';
 const columns=channel==='edm'?[entity,'Total Revenue','#Purchase','Click Rate','Module 2 CTR','Open Rate','Delivered']:channel==='reddit'?[entity,'Spend','CTR','CPM']:[entity,'Spend','Revenue','ROAS','#Purchase','CVR','CTR'];
 return <div className={channelStyles.list}>{items.map(item=><section key={item.id} className={channelStyles.card}><div className={channelStyles.header}><div className={channelStyles.headingText}><div className={channelStyles.eyebrow}>{item.channel}<CampaignStatusChip status={item.status}/></div><h2 className={channelStyles.title}>{item.name}</h2></div></div><div className={testStyles.summary}><div className={testStyles.summaryTitle}><Sparkles aria-hidden="true"/><h2>{testingAnalysisTitle(channel,language,item.name)}</h2></div><DataStatus/></div><div className={channelStyles.tableWrap}><table className={channelStyles.table}><thead><tr>{columns.map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody><tr><td colSpan={columns.length}><DataStatus/></td></tr></tbody></table></div><div className={testStyles.actions}><NovaButton variant="outline" disabled>{zh?'查看详细分析':'View detailed analysis'}<ChevronDown/></NovaButton><div className={reportStyles.questionAnchor}><NovaAiComposer value="" onChange={()=>{}} onSubmit={event=>event.preventDefault()} placeholder={zh?'基于这些洞察提问…':'Ask about these insights…'} inputLabel={zh?'基于这些洞察提问':'Ask about these insights'} disabled sendDisabled/></div></div></section>)}</div>;
}

/** Keep the channel cards visible while their data is fetched. */
export function ChannelDataLoading({channel}:{channel:string}){
 const {language}=useSiteLanguage(),zh=language==='zh',key=channels[channel];
 return <div aria-busy="true">
  <NovaCard className={reportStyles.readout}><div className={reportStyles.readoutBody}><div className={reportStyles.readoutHeading}><Sparkles aria-hidden="true"/><h2>{key?testingAnalysisTitle(key==='social'?'social-media':key,language):channel}</h2></div><div className={reportStyles.readoutSummary}><DataStatus/></div><div className={reportStyles.readoutActions}><NovaButton variant="outline" disabled>{zh?'查看完整分析':'View full analysis'}<ChevronDown/></NovaButton><div className={reportStyles.questionAnchor}><NovaAiComposer value="" onChange={()=>{}} onSubmit={event=>event.preventDefault()} placeholder={zh?'基于这些洞察提问…':'Ask about these insights…'} inputLabel={zh?'基于这些洞察提问':'Ask about these insights'} disabled sendDisabled/></div></div></div></NovaCard>
  {key==='social'?<section aria-label="Selected Instagram posts" className={channelStyles.card}><SocialPostTable posts={cachedInstagramPosts} loading/></section>:key?<Suspense fallback={<div className={channelStyles.list}><section className={channelStyles.card}><DataStatus/></section></div>}><CampaignCards channel={key}/></Suspense>:<DataStatus/>}
 </div>;
}

/** Show the real channel header immediately while navigation is being committed. */
export function ChannelRouteLoading({title,destination}:{title:string;destination?:string}){
 const pathname=usePathname(),channel=title.replace(/ Testing Performance$| Performance$/,'');
 return <><NovaSubpageHeader section={channel} title={title} redditDateFilter={channel==='Reddit'} showReportingPeriod backLabel="Back to campaign" pathOverride={destination} navigationPending={!!destination&&destination!==pathname}/><ChannelDataLoading channel={channel}/></>;
}
