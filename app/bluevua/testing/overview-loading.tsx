'use client';

import {LoaderCircle} from 'lucide-react';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {TestingChannelBrand} from './testing-channel-brand';
import {NovaButton,NovaCard,NovaInput,NovaTable,NovaTableBody,NovaTableCell,NovaTableHead,NovaTableHeader,NovaTableRow} from './nova-preview-ui';
import metricStyles from './nova-preview-metrics.module.css';
import sectionStyles from './nova-preview-sections.module.css';
import channelStyles from './nova-preview-channel-performance.module.css';
import styles from './overview-loading.module.css';

const metrics=['Total ROAS','Total Conversion Rate','Total Number of Assets','Total Revenue','Total Orders','Total Reach','Unique Reach','CTR'];
const channels=['Google Search','Google PMAX','Google Demand Gen','Meta','Reddit'];

/** Keep the overview layout visible while its period-specific data is fetched. */
export function OverviewLoadingContent(){
 const {language}=useSiteLanguage(),zh=language==='zh';
 return <div aria-busy="true">
  <p className={styles.status} role="status"><LoaderCircle aria-hidden="true"/>{zh?'正在加载数据…':'Loading data…'}</p>
  <NovaCard className={sectionStyles.readout}><div className={sectionStyles.readoutBody}>
   <div className={sectionStyles.readoutHeading}><h2>{zh?'测试总结':'Test summary'}</h2></div>
   <div className={sectionStyles.readoutSummary}><span className={styles.placeholder} aria-hidden="true"/></div>
   <div className={sectionStyles.readoutActions}><NovaButton variant="outline" disabled>{zh?'查看完整分析':'View detailed analysis'}</NovaButton><NovaInput className={styles.question} disabled placeholder={zh?'基于这些洞察提问…':'Ask about these insights…'}/></div>
  </div></NovaCard>
  <section className={metricStyles.section} aria-labelledby="overview-loading-metrics"><h2 id="overview-loading-metrics" className={metricStyles.sectionTitle}>{zh?'业务表现':'Business Performance'}</h2><div className={metricStyles.grid}>
   {metrics.map((title,index)=><article key={title} className={metricStyles.card} data-wide={index<2}><h3 className={metricStyles.cardTitle}>{title}</h3><p className={metricStyles.cardValue}><span className={styles.value} aria-hidden="true"/></p>{index<2&&<div className={styles.tabs}><span>{zh?'按渠道':'By channel'}</span><span>{zh?'按素材':'By asset'}</span></div>}<div className={styles.legend} aria-hidden="true"><span/><span/><span/><span/></div><div className={styles.chart} aria-hidden="true"/></article>)}
  </div></section>
  <section className={sectionStyles.channelSection} aria-labelledby="overview-loading-channels"><NovaCard className={channelStyles.card}><div className={channelStyles.header}><h2 id="overview-loading-channels">{zh?'渠道表现':'Channel Performance'}</h2></div><NovaTable aria-label={zh?'广告渠道表现':'Advertising channel performance'}><NovaTableHeader><NovaTableRow>{([zh?'渠道':'Channel','Spend','Revenue','Orders','Reach','CTR','ROAS']).map((label,index)=><NovaTableHead key={label} className={index?channelStyles.number:undefined}>{label}</NovaTableHead>)}</NovaTableRow></NovaTableHeader><NovaTableBody>{channels.map(channel=><NovaTableRow key={channel}><NovaTableCell><span className={sectionStyles.channelLink}><TestingChannelBrand name={channel}/>{channel}</span></NovaTableCell>{Array.from({length:6},(_,index)=><NovaTableCell key={index} className={channelStyles.number}><span className={styles.cell} aria-hidden="true"/></NovaTableCell>)}</NovaTableRow>)}</NovaTableBody></NovaTable>
   {[{name:'EDM',labels:['Delivered','Open rate','Email click rate','Orders','Revenue']},{name:'Social Media',labels:['Views','Likes','Comments','Shares','Saves']}].map(({name,labels})=><NovaTable key={name} aria-label={`${name} performance`}><NovaTableHeader><NovaTableRow><NovaTableHead>{zh?'渠道':'Channel'}</NovaTableHead>{labels.map(label=><NovaTableHead key={label} className={channelStyles.number}>{label}</NovaTableHead>)}</NovaTableRow></NovaTableHeader><NovaTableBody><NovaTableRow><NovaTableCell><span className={sectionStyles.channelLink}><TestingChannelBrand name={name}/>{name}</span></NovaTableCell>{labels.map(label=><NovaTableCell key={label} className={channelStyles.number}><span className={styles.cell} aria-hidden="true"/></NovaTableCell>)}</NovaTableRow></NovaTableBody></NovaTable>)}
  </NovaCard></section>
 </div>;
}
