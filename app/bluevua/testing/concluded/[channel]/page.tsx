import {TestingPageHeader} from "../../testing-page-header";
import styles from "../../channel-content.module.css";
import {withTestingReturnTo} from "@/lib/testing-navigation";
import { connection } from "next/server";
import { GoogleTestSection } from "../../google-test-section";
import { readConcludedSnapshot } from "@/lib/concluded-test-snapshot";
import { notFound } from "next/navigation";
import { concludedChannels, concludedTestsForChannel } from "@/lib/concluded-tests";

export default async function ConcludedChannelPage({params}: {params: Promise<{channel: string}>}) {
  const {channel: slug} = await params;
  const channel = concludedChannels.find(item => item.toLowerCase().replaceAll(" ","-") === (slug==="google"?"google-search":slug));
  if (!channel) notFound();
  await connection();
  const tests = concludedTestsForChannel(channel);
  const cards = await Promise.all(tests.map(async test => {
    const snapshot = await readConcludedSnapshot(test.id);
    return <div key={test.id} ><GoogleTestSection compact concludedTestId={test.id} test={snapshot?.report ?? {campaignName:test.campaignName,campaignStatus:"Concluded",periodLabel:"Test lifetime",period:test.lifetime,groups:[]}} creativeLinks={Object.fromEntries((snapshot?.report.groups??[]).map(group=>[group.adGroupId,withTestingReturnTo(`/bluevua/testing/google/concluded/${test.id}/${group.label==="Group A"?"treatment":"control"}`,`/bluevua/testing/concluded/${slug}`)]))} concludedOn={snapshot?.report.period?.end ?? test.lifetime?.end} description={test.name} resourcesHref={test.resourcesHref} emptyMessage="Final snapshot pending. Results are saved once, after the 10-day attribution window."/></div>;
  }));
  return <><TestingPageHeader section="Concluded Test" title={`${channel} · Concluded Tests`} backHref="/bluevua/testing/concluded" backLabel="Back to concluded tests" showReportingPeriod={false}/><section aria-label={`${channel} concluded tests`} className={styles.list}>{tests.length ? cards : <p className={`${styles.card} ${styles.empty}`}>No confirmed concluded tests have been added for {channel}.</p>}</section></>;
}
