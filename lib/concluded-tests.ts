import definitions from "@/config/concluded-tests.json";

/** Explicit test conclusions; platform delivery status is not a test conclusion. */
export const concludedChannels = ["Google", "Meta", "Reddit", "EDM"] as const;
export type ConcludedChannel = (typeof concludedChannels)[number];
export type ConcludedTest = {
  id: string;
  channel: ConcludedChannel;
  name: string;
  campaignName: string;
  concludedOn?: string;
  lifetime: { start: string; end: string } | null;
  experimentId?: string;
  summary: string;
  /** Optional existing report URL, including the original test's reporting dates. */
  reportHref?: string;
  resourcesHref?: string;
};

// Populate only from confirmed conclusions, never from paused/removed campaigns.
export const concludedTests: readonly ConcludedTest[] = definitions as ConcludedTest[];

export function concludedTestsForChannel(channel: ConcludedChannel) {
  return concludedTests.filter(test => test.channel === channel);
}
