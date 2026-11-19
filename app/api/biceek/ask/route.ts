import { currentSiteUser } from "@/lib/current-site-user";
import { consultBrandAssistant, runBrandAssistant } from "@/lib/ai-dashboard-brand-assist";
import { firstMarketDay, marketNames } from "@/lib/biceek-market-model";
import { biceekRunsOnEc2, readMarketSnapshot } from "@/lib/biceek-market-snapshot";

export const maxDuration = 120;

const isoDay = (value: unknown): value is string => typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;

export async function POST(request: Request) {
  if (!await currentSiteUser()) return Response.json({ error: "unauthorized" }, { status: 401 });
  const input = await request.json().catch(() => null);
  const question = typeof input?.question === "string" ? input.question.trim() : "";
  const { start, end, market } = input ?? {};
  if ((market !== undefined && market !== "GB") || !question || question.length > 2000 || !isoDay(start) || !isoDay(end) || start < firstMarketDay || start > end ||
      Date.parse(end) - Date.parse(start) >= 366 * 86_400_000) {
    return Response.json({ error: "invalid_scope" }, { status: 400 });
  }
  const snapshot = await readMarketSnapshot();
  const rows = snapshot?.rows.filter((row) => row.date >= start && row.date <= end && (!market || row.market === market)) ?? [];
  if (!snapshot || end > snapshot.through || !rows.length) return Response.json({ error: "missing_data" }, { status: 422 });
  const history = Array.isArray(input.history) ? input.history.slice(-6).flatMap((turn: unknown) => {
    const item = turn as { role?: unknown; text?: unknown } | null;
    return item && (item.role === "user" || item.role === "assistant") && typeof item.text === "string"
      ? [{ role: item.role, text: item.text.slice(0, 1800) }] : [];
  }) : [];
  const onEc2 = biceekRunsOnEc2();
  const result = await consultBrandAssistant({
    project: "biceek",
    prompt: `Interpret Biceek market performance and respond directly in ${input.language === "zh" ? "Simplified Chinese" : "English"}. Give the most useful answer first. Use the supplied rows and scope, cite dates and denominators for numeric claims, never infer causation from short windows. Conversation is optional context, not a source of facts. Current question: ${question}`,
    metrics: {
      start, end, currency: "USD", refreshedAt: snapshot.refreshedAt,
      markets: Object.fromEntries(Object.entries(marketNames).filter(([code]) => !market || code === market).map(([code, [name]]) => [code, name])),
      definitions: "Total ROAS = sum of Shopify Total Sales / (sum of Google Spend + sum of Meta Spend). Channel ROAS = sum of channel attributed purchase revenue / sum of channel spend. Null is missing. No ROAS for zero spend. Google and Shopify use Pacific dates; Meta uses Eastern dates.",
      columns: ["date", "market", "googleSpend", "googleRevenue", "metaSpend", "metaRevenue", "shopifySales", "orders"],
      rows: rows.map((row) => [row.date, row.market, row.googleSpend, row.googleRevenue, row.metaSpend, row.metaRevenue, row.shopifySales, row.orders]),
      conversation: history,
    },
  }, {
    mode: onEc2 ? "anc" : "ssh",
    timeoutMs: 100_000,
    runner: onEc2 ? request => runBrandAssistant({ ...request, executable: "/usr/local/bin/codex" }) : undefined,
  });
  if (result.status !== "available" || !result.notes.length) return Response.json({ error: "unavailable" }, { status: 502 });
  return Response.json({ answer: result.notes.join("\n\n") }, { headers: { "Cache-Control": "private, no-store" } });
}
