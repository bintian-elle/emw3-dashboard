type CampaignTest = {channel: string; campaignName: string};

/** Count each campaign once per channel, including legacy Search tests. */
export function countConcludedCampaigns(tests: readonly CampaignTest[], channel?: string): number {
  const campaigns = new Set<string>();
  for (const test of tests) {
    const normalizedChannel = test.channel === "Google" ? "Google Search" : test.channel;
    if (!channel || normalizedChannel === channel) campaigns.add(`${normalizedChannel}\u0000${test.campaignName}`);
  }
  return campaigns.size;
}
