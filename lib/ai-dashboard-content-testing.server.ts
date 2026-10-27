import "server-only";
import { loadTestingChatContext } from "@/lib/testing-chat-context";
import { getGoogleTestingPerformance } from "@/lib/google-testing-performance";
import { validTestingChatScope } from "@/lib/testing-chat-contract";
import type { ContentTestingSnapshot } from "@/lib/ai-dashboard-content-testing";

export async function loadDashboardContentTesting(range: { start: string; end: string }, prompt?: unknown): Promise<ContentTestingSnapshot> {
  void prompt;
  const scope = { channel: "overview" as const, page: "/bluevua/testing", period: { ...range, label: "Custom" } };
  if (!validTestingChatScope(scope)) throw new Error("Invalid Content Testing date range.");
  const [context, google] = await Promise.allSettled([
    loadTestingChatContext(scope),
    getGoogleTestingPerformance({ preset: "custom", ...range }),
  ]);
  const dataGaps: string[] = [];
  if (context.status === "rejected") dataGaps.push("Content Testing page data is temporarily unavailable.");
  if (google.status === "rejected") dataGaps.push("Concluded Content Testing page data is temporarily unavailable.");
  const source = context.status === "fulfilled" ? context.value : null;
  if (source?.data_gaps.length) dataGaps.push("One or more Content Testing channels are unavailable for the requested dates.");
  const exactGoogle = google.status === "fulfilled" && google.value.activeCards.every(card => !card.period || (card.period.start === range.start && card.period.end === range.end));
  if (google.status === "fulfilled" && !exactGoogle) dataGaps.push("Concluded page data could not be matched to the requested dates.");
  return JSON.parse(JSON.stringify({
    project: "bluevua", sourcePage: "/bluevua/testing", range,
    tests: source?.tests ?? [],
    concluded: exactGoogle && google.status === "fulfilled" ? google.value.concluded : [],
    dataGaps, metricContract: source?.metric_contract ?? { scope: "Exact Content Testing page scope only. Missing metrics are unavailable, not zero." },
    navigationLinks: source?.navigation_links ?? [],
  })) as ContentTestingSnapshot;
}
