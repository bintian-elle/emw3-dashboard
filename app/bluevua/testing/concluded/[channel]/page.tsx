import {withTestingReturnTo} from "@/lib/testing-navigation";
import Link from "next/link";
import { connection } from "next/server";
import { GoogleTestSection } from "../../google-test-section";
import { readConcludedSnapshot } from "@/lib/concluded-test-snapshot";
import { notFound } from "next/navigation";
import { concludedChannels, concludedTestsForChannel } from "@/lib/concluded-tests";

export default async function ConcludedChannelPage({params}: {params: Promise<{channel: string}>}) {
  const {channel: slug} = await params;
  const channel = concludedChannels.find(item => item.toLowerCase() === slug);
  if (!channel) notFound();
  await connection();
  const tests = concludedTestsForChannel(channel);
  const cards = await Promise.all(tests.map(async test => {
    const snapshot = await readConcludedSnapshot(test.id);
    return <div key={test.id}><GoogleTestSection compact test={snapshot?.report ?? {campaignName:test.campaignName,campaignStatus:"Concluded",periodLabel:"Test lifetime",period:test.lifetime,groups:[]}} creativeLinks={Object.fromEntries((snapshot?.report.groups??[]).map(group=>[group.adGroupId,withTestingReturnTo(`/bluevua/testing/google/concluded/${test.id}/${group.label==="Group A"?"treatment":"control"}`,`/bluevua/testing/concluded/${slug}`)]))} concludedOn={snapshot?.report.period?.end ?? test.lifetime?.end} description={test.name} resourcesHref={test.resourcesHref} emptyMessage="Final snapshot pending. Results are saved once, after the 10-day attribution window."/></div>;
  }));
  return <><header className="mb-6"><Link href="/bluevua/testing/concluded" className="text-body-medium text-text-secondary hover:text-text-primary">Concluded Test · Overview</Link><h1 className="mt-2 text-title-1-semibold text-text-primary">{channel} · Concluded Tests</h1></header><section aria-label={`${channel} concluded tests`} className="grid gap-4">{tests.length ? cards : <p className="rounded-3xl border border-border-button-default bg-background-primary-default p-6 text-body-regular text-text-secondary">No confirmed concluded tests have been added for {channel}.</p>}</section></>;
}
