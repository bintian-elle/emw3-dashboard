import {Suspense} from 'react';
import {expandedGoogleReports,type ExpandedTestingData} from '@/lib/google-expanded-content-testing';
import type {getGoogleTestingPerformance} from '@/lib/google-testing-performance';
import type {MetaCampaignTest} from '@/lib/testing-meta';
import type {RedditTestingData} from '@/lib/testing-reddit';
import type {EdmTestingData} from '@/lib/testing-edm';
import {getSocialPerformance} from '@/lib/testing-social';
import {buildChannelPerformance} from '@/lib/channel-performance-data';
import {edmSpecialMetrics,socialSpecialMetrics} from '@/lib/channel-special-performance-data';
import {NovaChannelContent,NovaSocialSummary} from './nova-preview-channel-content';
import styles from './nova-preview-sections.module.css';

async function SocialSummary(){
 const data=await getSocialPerformance().catch(()=>null);
 return <NovaSocialSummary metrics={socialSpecialMetrics(data?.posts??[])} stale={data?data.stale||data.error:true}/>;
}

/** Same data transformations as ChannelPerformance, rendered with Nova UI. */
export function NovaChannelPerformance({google,meta,reddit,edm,pmax,demandGen,query}:{google:Awaited<ReturnType<typeof getGoogleTestingPerformance>>;meta:MetaCampaignTest;reddit:RedditTestingData;edm:EdmTestingData;pmax:ExpandedTestingData;demandGen:ExpandedTestingData;query:string}){
 const rows=buildChannelPerformance({search:[...google.activeCards,...google.concluded.map(item=>item.report)],pmax:expandedGoogleReports(pmax),demandGen:expandedGoogleReports(demandGen),meta,reddit,edm,query});
 const email=rows.find(row=>row.key==='edm')!;
 return <NovaChannelContent rows={rows.filter(row=>row.key!=='edm')} email={email} emailMetrics={edmSpecialMetrics(edm.tests)} social={<Suspense fallback={<p className={styles.loading} role="status">Loading Social Media…</p>}><SocialSummary/></Suspense>}/>;
}
