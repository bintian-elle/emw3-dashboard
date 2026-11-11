import {Suspense} from "react";
import {ChannelDataLoading} from "../channel-route-loading";
import {NovaChannelReport} from "../nova-subpage-header";
import {getSocialPerformance} from "@/lib/testing-social";
import {after} from "next/server";
import {isCompleteSocialSnapshot} from "@/lib/testing-social-snapshot";
import {isReviewPreview} from "@/lib/review-preview.server";
import {currentSiteUser} from "@/lib/current-site-user";
import {SocialCoverageNotice} from "./social-coverage-notice";
import {ChannelReportPeriodProvider,ChannelReportPeriodSync} from "../channel-report-period";
import {socialSnapshotPeriod} from "@/lib/testing-social-period";
import {SocialPostTable} from "./social-post-table";
import {SocialLifetimePresentationProvider} from "../insight-presentation";
import {readStoredSocialLifetime} from "@/lib/testing-report-store.server";
import {TestingPageHeader} from "../testing-page-header";
import styles from "../channel-content.module.css";
export const maxDuration=300;

async function SocialContent(){
 const [data, reports,preview,user]=await Promise.all([getSocialPerformance(),readStoredSocialLifetime().catch(()=>null),isReviewPreview(),currentSiteUser()]);
 const incomplete=!isCompleteSocialSnapshot(data);
 const tablePeriod=socialSnapshotPeriod(data);
 if(incomplete&&!preview&&user)after(async()=>{try{await (await import('@/lib/testing-social')).repairMissingSocialCoverage();}catch{console.error('Social coverage repair unavailable; existing snapshot retained.');}});
 return <SocialLifetimePresentationProvider reports={reports}>{tablePeriod&&<ChannelReportPeriodSync period={tablePeriod}/>}<NovaChannelReport/>
 {data.error&&<p role="status" className={styles.notice}>{data.stale?"Instagram refresh is unavailable. Showing the last saved results.":"Instagram data is temporarily unavailable. Post links remain available."}</p>}
 {incomplete&&!preview&&user&&<SocialCoverageNotice/>}
 <section aria-label="Selected Instagram posts" className={styles.card}><SocialPostTable posts={data.posts} dataVersion={data.capturedAt}/></section></SocialLifetimePresentationProvider>;
}

export default function SocialPerformancePage(){return <ChannelReportPeriodProvider><TestingPageHeader headerOnly section="Social Media" title="Social Media Performance"/><Suspense fallback={<ChannelDataLoading channel="Social Media"/>}><SocialContent/></Suspense></ChannelReportPeriodProvider>;}
