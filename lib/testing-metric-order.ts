// Shared display order: preserve each platform's existing metric set.
const metricOrder: Record<string, number> = {
  spend: 0, revenue: 1, roas: 2, orders: 3, purchases: 3,
  cvr: 4, impressions: 5, clicks: 6, ctr: 7, cpa: 8, aov: 9,
};
export function orderTestingMetrics<T extends {key?: string; label: string}>(metrics: readonly T[]): T[] {
  const rank = (metric: T) => metricOrder[metric.key ?? ({
    Spend: "spend", Revenue: "revenue", "Total Revenue": "revenue", ROAS: "roas",
    Orders: "orders", "#Purchase": "orders", CVR: "cvr", Impressions: "impressions",
    Clicks: "clicks", CTR: "ctr", "Click Rate": "ctr", CPA: "cpa", AOV: "aov",
  } as Record<string, string>)[metric.label]] ?? 10;
  return [...metrics].sort((a, b) => rank(a) - rank(b));
}
