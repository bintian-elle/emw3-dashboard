import { randomUUID } from "node:crypto";
import { listBiceekChat, saveBiceekChat, sameBiceekChatScope, validChatId, type BiceekChatTurn } from "@/lib/biceek-chat-history";
import { currentSiteUser } from "@/lib/current-site-user";
import { consultBrandAssistant, runBrandAssistant } from "@/lib/ai-dashboard-brand-assist";
import { firstMarketDay, marketNames } from "@/lib/biceek-market-model";
import { biceekRunsOnEc2, readMarketSnapshot } from "@/lib/biceek-market-snapshot";

export const maxDuration = 120;

const isoDay = (value: unknown): value is string => typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET() {
  const user = await currentSiteUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401, headers: privateHeaders });
  try { return Response.json({ turns: await listBiceekChat(user.sub) }, { headers: privateHeaders }); }
  catch { return Response.json({ error: "history_unavailable" }, { status: 503, headers: privateHeaders }); }
}

export async function POST(request: Request) {
  const user = await currentSiteUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
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
  const comparison = input.comparison;
  const comparisonStart = comparison?.start, comparisonEnd = comparison?.end;
  const hasComparison = isoDay(comparisonStart) && isoDay(comparisonEnd) && comparisonStart <= comparisonEnd
    && comparisonEnd <= snapshot.through && Date.parse(comparisonEnd) - Date.parse(comparisonStart) < 366 * 86_400_000;
  const comparisonRows = hasComparison ? snapshot.rows.filter(row =>
    row.date >= comparisonStart && row.date <= comparisonEnd && (!market || row.market === market)) : [];
  const encodeRows = (values: typeof rows) => values.map(row =>
    [row.date, row.market, row.googleSpend, row.googleRevenue, row.metaSpend, row.metaRevenue, row.shopifySales, row.orders]);
  const scope = { start, end, market, ...(hasComparison ? { comparison: { start: comparisonStart, end: comparisonEnd } } : {}) };
  const id = validChatId(input.id) ? input.id : randomUUID();
  const conversation = validChatId(input.conversation) ? input.conversation : randomUUID();
  const turn: BiceekChatTurn = { id, conversation, scope, question, answer: null, at: new Date().toISOString() };
  let history: Array<{ role: string; text: string }>;
  try {
    const saved = await listBiceekChat(user.sub);
    const existing = saved.find(item => item.id === id);
    if (existing) {
      return existing.answer && existing.question === question && existing.conversation === conversation && sameBiceekChatScope(existing.scope, scope)
        ? Response.json({ answer: existing.answer, turn: existing }, { headers: privateHeaders })
        : Response.json({ error: "duplicate_question" }, { status: 409, headers: privateHeaders });
    }
    history = saved.filter(item => item.conversation === conversation && item.answer && sameBiceekChatScope(item.scope, scope))
      .slice(-3).flatMap(item => [{ role: "user", text: item.question }, { role: "assistant", text: item.answer! }]);
    await saveBiceekChat(user.sub, turn, true);
  } catch (error) {
    const duplicate = (error as NodeJS.ErrnoException).code === "EEXIST";
    return Response.json({ error: duplicate ? "duplicate_question" : "history_unavailable" },
      { status: duplicate ? 409 : 503, headers: privateHeaders });
  }
  const onEc2 = biceekRunsOnEc2();
  const result = await consultBrandAssistant({
    project: "biceek",
    scope: "market-overview",
    prompt: `Interpret Biceek market performance and respond directly in ${input.language === "zh" ? "Simplified Chinese" : "English"}. Give the most useful answer first. Use the supplied rows and scope, cite dates and denominators for numeric claims, and never infer causation from short windows. Use the selected comparison period only for relevant comparisons, and state if its data is incomplete. Conversation is optional context, not a source of facts. Current question: ${question}`,
    metrics: {
      start, end, currency: "USD", refreshedAt: snapshot.refreshedAt,
      markets: Object.fromEntries(Object.entries(marketNames).filter(([code]) => !market || code === market).map(([code, [name]]) => [code, name])),
      definitions: "Total ROAS = sum of Shopify Total Sales / (sum of Google Spend + sum of Meta Spend). Channel ROAS = sum of channel attributed purchase revenue / sum of channel spend. Null is missing. No ROAS for zero spend. Google and Shopify use Pacific dates; Meta uses Eastern dates.",
      columns: ["date", "market", "googleSpend", "googleRevenue", "metaSpend", "metaRevenue", "shopifySales", "orders"],
      rows: encodeRows(rows),
      comparison: hasComparison ? { start: comparisonStart, end: comparisonEnd, rows: encodeRows(comparisonRows) } : undefined,
      conversation: history,
    },
  }, {
    mode: onEc2 ? "anc" : "ssh",
    timeoutMs: 100_000,
    runner: onEc2 ? request => runBrandAssistant({ ...request, executable: "/usr/local/bin/codex" }) : undefined,
  });
  if (result.status !== "available" || !result.notes.length) return Response.json({ error: "unavailable" }, { status: 502 });
  const answer = result.notes.map(note => note.split(/(?<=[。！？])|(?<=[.!?])(?=\s)|(?<=\n)/u)
    .filter(sentence => !/content[\s_-]*testing|(?:内容|素材)测试/iu.test(sentence)).join("").trim())
    .filter(Boolean).join("\n\n");
  turn.answer = answer || (input.language === "zh"
    ? "我可以根据所选市场和日期回答 Google Ads、Meta Ads 和 Shopify 的表现。请问你想看哪个指标？"
    : "I can answer questions about Google Ads, Meta Ads, and Shopify for the selected markets and dates. Which metric would you like to look at?");
  try { await saveBiceekChat(user.sub, turn); }
  catch { return Response.json({ error: "history_unavailable" }, { status: 503, headers: privateHeaders }); }
  return Response.json({ answer: turn.answer, turn }, { headers: privateHeaders });
}
