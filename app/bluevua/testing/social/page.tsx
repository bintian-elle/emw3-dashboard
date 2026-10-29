import {getSocialPerformance} from "@/lib/testing-social";
import {SocialPostTable} from "./social-post-table";
import {TestReadout} from "../test-readout";
import {TestingPageHeader} from "../testing-page-header";
import styles from "../channel-content.module.css";

export default async function SocialPerformancePage(){
 const data=await getSocialPerformance();
 return <><TestingPageHeader section="Social Media" title="Social Media Performance" showReportingPeriod={false}/><p className={styles.muted}>Instagram · @bluevua · 10 selected posts for the September review · Lifetime post metrics</p>
 {data.error&&<p role="status" className={styles.notice}>{data.stale?"Instagram refresh is unavailable. Showing the last saved results.":"Instagram data is temporarily unavailable. Post links remain available."}</p>}
 <TestReadout standalone channel="social" testIdentity="social-selected-posts" period={{label:"Lifetime snapshot",start:"",end:""}}><section aria-label="Selected Instagram posts" className={styles.card}><SocialPostTable posts={data.posts}/></section><p className={styles.muted}>Dates show actual publication dates in UTC. The selected set includes an October 1 post. “—” means unavailable; Requests for these Reels returned #100: The Media Insights API does not support the follows metric for this media product type.</p></TestReadout></>;
}
