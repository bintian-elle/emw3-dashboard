import {TestingAiScope} from "../../../../testing-ai";
import {TestingPageHeader} from "../../../../testing-page-header";
import styles from "../../../../channel-content.module.css";
import {readConcludedSnapshot} from "@/lib/concluded-test-snapshot";
import {safeTestingReturnTo,withTestingReturnTo} from "@/lib/testing-navigation";
import Link from "@/app/bluevua/testing/testing-link";
import {connection} from "next/server";
import {notFound} from "next/navigation";
import {readGoogleCreativeArchive} from "@/lib/google-creative-archive";
import {concludedTests} from "@/lib/concluded-tests";

export default async function ExperimentArmCreativesPage({params,searchParams}:{params:Promise<{test:string;arm:string}>;searchParams:Promise<{returnTo?:string}>}){
 await connection();const {test:id,arm}=await params;
 const definition=concludedTests.find(test=>test.id===id);
 if(!definition||!["treatment","control"].includes(arm))notFound();
 const lifetime=(await readConcludedSnapshot(id))?.report.period??definition.lifetime;
 const query=await searchParams;
 const returnTo=safeTestingReturnTo(query.returnTo,"/bluevua/testing/concluded/google");
 const currentPage=withTestingReturnTo(`/bluevua/testing/google/concluded/${id}/${arm}`,returnTo);
 const archive=await readGoogleCreativeArchive();
 const campaignName=arm==="treatment"?"EM-Search-Brand-Mar25 Brand_AbsTopPageTest_2026/07":"EM-Search-Brand-Mar25";
 const campaign=archive?.campaigns.find(item=>item.name===campaignName);
 const groups=archive?.groups.filter(row=>row.campaign.id===campaign?.id)||[];
 return <>{lifetime&&<TestingAiScope channel="google-search" campaign={definition.campaignName} period={{label:"Test lifetime",...lifetime,concludedTestId:id}}/>}<TestingPageHeader section="Google Search" title={arm==="treatment"?"Group A · Test":"Group B · Control"} backHref={returnTo} backLabel={returnTo.startsWith("/bluevua/testing/concluded")?"Back to Google concluded tests":returnTo.split("?")[0]==="/bluevua/testing"?"Back to overview":"Back to Google testing"} showReportingPeriod={false}/><p className={styles.muted}>{campaignName}</p><section className={styles.channelGrid} aria-label="Experiment ad groups">{groups.map(({adGroup})=><Link key={adGroup.id} href={withTestingReturnTo(`/bluevua/testing/google/search/${adGroup.id}`,currentPage)} className={`${styles.card} ${styles.channelCard}`}><h2>{adGroup.name}</h2><p className={styles.muted}>{archive?.ads.filter(ad=>ad.adGroup.id===adGroup.id).length} ads · View creatives →</p></Link>)}</section>{!groups.length&&<p className={styles.muted}>Creative archive is not available yet.</p>}</>;
}
