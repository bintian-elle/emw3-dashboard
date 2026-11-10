import {getSocialPerformance} from "@/lib/testing-social";
import {SocialPostTable} from "./social-post-table";
import {SocialLifetimePresentationProvider} from "../insight-presentation";
import {readStoredSocialLifetime} from "@/lib/testing-report-store.server";
import {TestingPageHeader} from "../testing-page-header";
import styles from "../channel-content.module.css";

export default async function SocialPerformancePage(){
 const [data, reports]=await Promise.all([getSocialPerformance(),readStoredSocialLifetime().catch(()=>null)]);
 return <SocialLifetimePresentationProvider reports={reports}><TestingPageHeader section="Social Media" title="Social Media Performance" showReportingPeriod={false}/><p className={styles.muted}>Instagram · @bluevua · 10 selected posts for the September review · Lifetime post metrics</p>
 {data.error&&<p role="status" className={styles.notice}>{data.stale?"Instagram refresh is unavailable. Showing the last saved results.":"Instagram data is temporarily unavailable. Post links remain available."}</p>}
 <section aria-label="Selected Instagram posts" className={styles.card}><SocialPostTable posts={data.posts}/></section></SocialLifetimePresentationProvider>;
}
