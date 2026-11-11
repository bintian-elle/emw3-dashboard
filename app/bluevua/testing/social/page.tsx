import {Suspense} from "react";
import {ChannelDataLoading} from "../channel-route-loading";
import {NovaChannelReport} from "../nova-subpage-header";
import {getSocialPerformance} from "@/lib/testing-social";
import {SocialPostTable} from "./social-post-table";
import {SocialLifetimePresentationProvider} from "../insight-presentation";
import {readStoredSocialLifetime} from "@/lib/testing-report-store.server";
import {TestingPageHeader} from "../testing-page-header";
import styles from "../channel-content.module.css";

async function SocialContent(){
 const [data, reports]=await Promise.all([getSocialPerformance(),readStoredSocialLifetime().catch(()=>null)]);
 return <SocialLifetimePresentationProvider reports={reports}><NovaChannelReport/>
 {data.error&&<p role="status" className={styles.notice}>{data.stale?"Instagram refresh is unavailable. Showing the last saved results.":"Instagram data is temporarily unavailable. Post links remain available."}</p>}
 <section aria-label="Selected Instagram posts" className={styles.card}><SocialPostTable posts={data.posts} dataVersion={data.capturedAt}/></section></SocialLifetimePresentationProvider>;
}

export default function SocialPerformancePage(){return <><TestingPageHeader headerOnly section="Social Media" title="Social Media Performance"/><Suspense fallback={<ChannelDataLoading channel="Social Media"/>}><SocialContent/></Suspense></>;}
