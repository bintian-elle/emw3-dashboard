import {Suspense} from 'react';
import {expandedGoogleReports,type ExpandedTestingData} from '@/lib/google-expanded-content-testing';
import type {getGoogleTestingPerformance} from '@/lib/google-testing-performance';
import type {MetaCampaignTest} from '@/lib/testing-meta';
import type {RedditTestingData} from '@/lib/testing-reddit';
import type {EdmTestingData} from '@/lib/testing-edm';
import {getSocialPerformance} from '@/lib/testing-social';
import {buildChannelPerformance} from '@/lib/channel-performance-data';
import {edmSpecialMetrics,socialSpecialMetrics} from '@/lib/channel-special-performance-data';
import {ChannelPerformanceHeading,ChannelPerformanceLoading,ChannelPerformanceRows} from './channel-performance-rows';
import {EdmChannelPerformance,SocialChannelPerformance} from './channel-special-performance';

async function SocialPerformanceRow(){
 const data=await getSocialPerformance().catch(()=>null);
 return <SocialChannelPerformance metrics={socialSpecialMetrics(data?.posts??[])} stale={data?data.stale||data.error:true}/>;
}
export function ChannelPerformance({google,meta,reddit,edm,pmax,demandGen,query}:{google:Awaited<ReturnType<typeof getGoogleTestingPerformance>>;meta:MetaCampaignTest;reddit:RedditTestingData;edm:EdmTestingData;pmax:ExpandedTestingData;demandGen:ExpandedTestingData;query:string}){
 const rows=buildChannelPerformance({search:[...google.activeCards,...google.concluded.map(item=>item.report)],pmax:expandedGoogleReports(pmax),demandGen:expandedGoogleReports(demandGen),meta,reddit,edm,query});
 const email=rows.find(row=>row.key==='edm')!;
 return <section aria-labelledby="channel-performance" className="mt-10"><ChannelPerformanceHeading/><div className="mt-4 overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default"><ChannelPerformanceRows rows={rows.filter(row=>row.key!=='edm')}/></div><div className="mt-4 grid gap-4 lg:grid-cols-2"><EdmChannelPerformance metrics={edmSpecialMetrics(edm.tests)} href={email.href} anchors={email.anchors}/><Suspense fallback={<ChannelPerformanceLoading/>}><SocialPerformanceRow/></Suspense></div></section>;
}
