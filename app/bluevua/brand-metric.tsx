import { getGoogleAdsDashboard } from "@/lib/google-ads";
import { loadDashboard } from "@/lib/klaviyo-dashboard";
import { comparisonRanges } from "@/lib/ai-dashboard-periods";
import { readTrackingCache } from "@/lib/website-tracking-cache";
import { trackingPeriod, type TrackingPeriod } from "@/lib/website-tracking";
import { resolveTestingPeriod, testingLatestCompleteDate } from "@/lib/testing-period";
import { hasComparisonGoogleSnapshot, readComparisonPeriod } from "@/lib/testing-comparison.server";
import { getGoogleTestingPerformance } from "@/lib/google-testing-performance";
import { expandedGoogleReports, getExpandedGoogleTesting } from "@/lib/google-expanded-content-testing";
import { overviewHeadlineMetrics, type OverviewHeadlineInput } from "@/lib/overview-headline-metrics";
import { ComparisonValueDelta } from "./testing/testing-comparison";
import styles from "../workspace-entry.module.css";

export type BrandMetricSource = "google" | "edm" | "tracking" | "testing";
const labels = { google: "ROAS", edm: "EDM Revenue", tracking: "Visitors", testing: "Total ROAS" };
const comparisonMetrics = { google: "roas", edm: "revenue", tracking: "visitors", testing: "roas" };
const formats = {
  google: (value: number) => `${value.toFixed(2)}×`,
  testing: (value: number) => `${value.toFixed(2)}×`,
  edm: (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
  tracking: (value: number) => value.toLocaleString("en-US"),
};

async function testingRoas(range: TrackingPeriod) {
  const [meta, reddit, edm, ...googleCoverage] = await Promise.all([
    readComparisonPeriod("meta", range),
    readComparisonPeriod("reddit", range),
    readComparisonPeriod("edm", range),
    hasComparisonGoogleSnapshot("google-search", range),
    hasComparisonGoogleSnapshot("google-pmax", range),
    hasComparisonGoogleSnapshot("google-demand-gen", range),
  ]);
  if (!meta || !reddit || !edm || !googleCoverage.every(Boolean)) return null;
  const input = { preset: "custom" as const, ...range };
  const [search, pmax, demandGen] = await Promise.all([
    getGoogleTestingPerformance(input),
    getExpandedGoogleTesting("pmax", input),
    getExpandedGoogleTesting("demand-gen", input),
  ]);
  return overviewHeadlineMetrics({
    google: [...search.activeCards, ...search.concluded.map(item => item.report), ...expandedGoogleReports(pmax), ...expandedGoogleReports(demandGen)],
    meta: meta as OverviewHeadlineInput["meta"],
    reddit: reddit as OverviewHeadlineInput["reddit"],
    edm: edm as OverviewHeadlineInput["edm"],
  }).roas;
}

async function loadMetric(source: BrandMetricSource) {
  if (source === "google") {
    const { metrics, range } = await getGoogleAdsDashboard();
    const roas = metrics.find(metric => metric.label === "ROAS");
    return { value: roas?.value, previous: roas?.priorValue, range };
  }
  if (source === "tracking") {
    const range = trackingPeriod({});
    const { data } = await readTrackingCache(range, "all");
    const visitors = (report: NonNullable<typeof data>["overview"] | undefined) =>
      report?.error ? null : report?.rows[0]?.metrics[0];
    return { value: visitors(data?.overview), previous: visitors(data?.comparison?.overview), range };
  }
  const range = resolveTestingPeriod(testingLatestCompleteDate(), { preset: "lastWeek" });
  const comparison = comparisonRanges(range).pop;
  if (source === "edm") {
    const data = await loadDashboard({ range, comparison, presetLabel: "Last Week", comparisonLabel: "Previous period" });
    return {
      value: data.dataUpdatedThrough >= range.end ? data.totals.edmRevenue : null,
      previous: data.dataUpdatedThrough >= comparison.end ? data.previous.edmRevenue : null,
      range,
    };
  }
  const [value, previous] = await Promise.all([testingRoas(range), testingRoas(comparison)]);
  return { value, previous, range };
}

export async function BrandMetric({ source }: { source: BrandMetricSource }) {
  const metric = await loadMetric(source).catch(() => null);
  const value = metric?.value;
  const previous = metric?.previous;
  return (
    <div className={styles.brandMetric}>
      <div className={styles.brandMetricValues}>
        <span>{labels[source]}</span>
        <strong>{value == null ? "—" : formats[source](value)}</strong>
        <ComparisonValueDelta metric={comparisonMetrics[source]} value={value} previous={previous} />
      </div>
    </div>
  );
}
