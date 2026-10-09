import Link from "next/link";
import { concludedChannels, concludedTestsForChannel } from "@/lib/concluded-tests";

export default function ConcludedOverviewPage() {
  return <><header className="mb-6"><p className="text-caption-1-semibold text-text-tertiary">CONCLUDED TEST</p><h1 className="mt-1 text-title-1-semibold text-text-primary">Overview</h1><p className="mt-2 text-body-regular text-text-secondary">Concluded tests by channel.</p></header><section aria-label="Concluded test counts" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{concludedChannels.map(channel => <Link key={channel} href={`/bluevua/testing/concluded/${channel.toLowerCase()}`} className="rounded-3xl border border-border-button-default bg-background-primary-default p-6 outline-none hover:bg-background-primary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"><h2 className="text-body-medium text-text-secondary">{channel}</h2><p className="mt-3 text-title-1-semibold tabular-nums text-text-primary">{concludedTestsForChannel(channel).length}</p><p className="mt-1 text-caption-1-regular text-text-tertiary">Concluded tests</p></Link>)}</section></>;
}
