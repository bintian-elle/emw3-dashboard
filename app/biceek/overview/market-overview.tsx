"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import { TrackingTrend } from "@/app/bluevua/tracking/tracking-trend";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import { ComparisonValueDelta, DashboardPeriodComparison, dashboardComparisonOptions } from "@/app/bluevua/testing/testing-comparison";
import { NovaReportingPeriodSelect, novaReportingPeriods } from "@/app/bluevua/testing/nova-reporting-period";
import { resolveTestingPeriod } from "@/lib/testing-period";
import { MetricSortHeader, MetricSortedRows, MetricSortScope } from "@/app/bluevua/testing/metric-sorting";
import { comparisonRange, type ComparisonRange } from "@/lib/testing-comparison";
import { TestingChannelBrand } from "@/app/bluevua/testing/testing-channel-brand";
import { NovaButton } from "@/app/bluevua/testing/nova-preview-ui";
import nova from "@/app/bluevua/testing/nova-preview-shell.module.css";
import { marketNames as markets, firstMarketDay as firstDay, localizationLaunch as launch, type Market, type MarketDay, type MarketMetric, type MarketSnapshot } from "@/lib/biceek-market-model";
import { MarketAskAi } from "./market-ask-ai";
import styles from "./market-overview.module.css";

const marketCodes = Object.keys(markets) as Market[];
const dayOffset = (day: string, amount: number) =>
  new Date(Date.parse(day) + amount * 86_400_000).toISOString().slice(0, 10);
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const count = new Intl.NumberFormat("en-US");
const formatMoney = (value: number | null) => value === null ? "—" : money.format(value);
const formatCount = (value: number | null) => value === null ? "—" : count.format(value);
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 2 });
const formatPercent = (value: number | null) => value === null ? "—" : percent.format(value);
const formatRatio = (value: number | null) => value === null ? "—" : `${value.toFixed(2)}×`;
const ratio = (value: number | null, spend: number | null) =>
  value !== null && spend !== null && spend > 0 ? value / spend : null;
const add = (a: number | null, b: number | null) => a === null || b === null ? null : a + b;

const comparisonColumns = [
  ["googleSpend", "Spend", "Google Ads"], ["googleRevenue", "Revenue", "Google Ads"], ["googleRoas", "ROAS", "Google Ads"],
  ["metaSpend", "Spend", "Meta Ads"], ["metaRevenue", "Revenue", "Meta Ads"], ["metaRoas", "ROAS", "Meta Ads"],
  ["spend", "Ad Spend"], ["sales", "Total Sales"], ["orders", "Orders"], ["roas", "Total ROAS"],
] as const;
const reviewColumns = [["spend", "Ad Spend"], ["sales", "Shopify Total Sales"], ["orders", "Orders"], ["cvr", "CVR"], ["roas", "Total ROAS"]] as const;

function summarize(rows: MarketDay[], start: string, end: string, marketCount = 1) {
  const selected = rows.filter((row) => row.date >= start && row.date <= end);
  const days = (Date.parse(end) - Date.parse(start)) / 86_400_000 + 1;
  const sum = (metric: MarketMetric) => days > 0 && selected.length === days * marketCount && selected.every((row) => typeof row[metric] === "number")
    ? selected.reduce((total, row) => total + (row[metric] ?? 0), 0) : null;
  const googleSpend = sum("googleSpend");
  const googleRevenue = sum("googleRevenue");
  const metaSpend = sum("metaSpend");
  const metaRevenue = sum("metaRevenue");
  const spend = add(googleSpend, metaSpend);
  const sales = sum("shopifySales");
  return { googleSpend, googleRevenue, googleRoas: ratio(googleRevenue, googleSpend),
    metaSpend, metaRevenue, metaRoas: ratio(metaRevenue, metaSpend), spend, sales,
    orders: sum("orders"), roas: ratio(sales, spend),
    atcRate: ratio(sum("addToCart"), sum("sessions")), checkoutRate: ratio(sum("beginCheckout"), sum("sessions")),
    cvr: ratio(sum("orders"), sum("sessions")) };
}

const chartColors = ["var(--color-chart-1)", "var(--color-chart-3)", "var(--color-chart-5)"];

const channels = [
    { title:"Google Ads", brand:"Google Ads", spend:"googleSpend", revenue:"googleRevenue", roas:"googleRoas" },
    { title:"Meta Ads", brand:"Meta", spend:"metaSpend", revenue:"metaRevenue", roas:"metaRoas" },
    { title:"Shopify / Total", brand:null, spend:"spend", revenue:"sales", roas:"roas" },
  ] as const;

const trendNames = {
  spend: ["Daily Spend", "每日花费"], revenue: ["Daily Revenue", "每日收入"], roas: ["Daily ROAS", "每日 ROAS"],
  orders: ["Daily Orders", "每日订单"], funnel: ["Daily Conversion Rates", "每日转化率"],
} as const;

function MarketTrend({ metric, rows, marketCount, range }: {
  metric: keyof typeof trendNames; rows: MarketDay[]; marketCount: number; range: ComparisonRange;
}) {
  const zh = useSiteLanguage().language === "zh";
  const [country, setCountry] = useState("all");
  const [channel, setChannel] = useState("all");
  const title = trendNames[metric][zh ? 1 : 0];
  const byDay = new Map<string, MarketDay[]>();
  for (const row of rows) {
    if (row.date < range.start || row.date > range.end || (country !== "all" && row.market !== country)) continue;
    const day = byDay.get(row.date) ?? [];
    day.push(row);
    byDay.set(row.date, day);
  }
  const dates = [...byDay.keys()].sort();
  const daily = dates.map(date => summarize(byDay.get(date) ?? [], date, date, country === "all" ? marketCount : 1));
  const channelName = (item: typeof channels[number]) => item.spend === "spend" && metric === "spend"
    ? (zh ? "总花费" : "Total spend") : item.title;
  const series = metric === "orders" ? [{ name: "Shopify", color: chartColors[2], values: daily.map(day => day.orders) }]
    : metric === "funnel" ? (["atcRate", "checkoutRate", "cvr"] as const).map((key, index) => ({
      name: ["ATC Rate", "Checkout Rate", "CVR"][index], color: chartColors[index], values: daily.map(day => day[key]),
    })) : channels.flatMap((item, index) => channel === "all" || channel === String(index)
      ? [{ name: channelName(item), color: chartColors[index], values: daily.map(day => day[item[metric]]) }] : []);
  const channelOptions = [[ "all", zh ? "全部渠道" : "All channels" ], ...channels.map((item, index) =>
    [String(index), channelName(item)] as const)] as const;
  return <article className={`${styles.panel} ${styles.chart}`} aria-label={title}>
    <div className={styles.chartHeader}>
      <h3>{title}</h3>
      <div className={styles.chartFilters}>
        {marketCount > 1 && <NovaReportingPeriodSelect ariaLabel={zh ? "国家" : "Country"} value={country} onValueChange={setCountry}
          options={[["all", zh ? "全部国家" : "All countries"], ...marketCodes.map(code => [code, markets[code][zh ? 1 : 0]] as const)]} />}
        {metric !== "orders" && metric !== "funnel" && <NovaReportingPeriodSelect ariaLabel={zh ? "渠道" : "Channel"}
          value={channel} onValueChange={setChannel} options={channelOptions} />}
      </div>
    </div>
    {series.some(item => item.values.some(value => value !== null)) ? <TrackingTrend key={`${country}:${channel}`} dates={dates} series={series}
      valueFormat={metric === "funnel" ? "percent" : metric === "orders" ? "number" : metric === "roas" ? "ratio" : "currency"} />
      : <p className={styles.muted} role="status">{zh ? "所选范围暂无数据。" : "No data for this selection."}</p>}
  </article>;
}

function PerformanceSection({ title, id, rows, marketCount, current, previous, link, linkLabel }: {
  title: string; id: string; rows: MarketDay[]; marketCount: number; current: ComparisonRange; previous: ComparisonRange;
  link?: string; linkLabel?: string;
}) {
  const now = summarize(rows, current.start, current.end, marketCount);
  const prior = summarize(rows, previous.start, previous.end, marketCount);
  return <section id={id} aria-labelledby={`${id}-title`}>
    <div className={styles.sectionHeading}>
      <h2 id={`${id}-title`}>{title}</h2>
      {link&&<Link href={link}>{linkLabel}</Link>}
    </div>
    <div className={styles.cards}>
      {channels.map(({title,brand,spend,revenue,roas},index)=><article className={styles.panel} key={title}>
        <h3>{brand ? <TestingChannelBrand name={brand} /> : <ShoppingBag size={18} aria-hidden="true" />}{title}</h3>
        <dl className={styles.kpis}>
          <div><dt>{index===2?"Total Ad Spend":"Spend"}</dt><dd>{formatMoney(now[spend])}<ComparisonValueDelta metric="spend" value={now[spend]} previous={prior[spend]} /></dd></div>
          <div><dt>{index===2?"Shopify Total Sales":"Attributed Revenue"}</dt><dd>{formatMoney(now[revenue])}<ComparisonValueDelta metric="revenue" value={now[revenue]} previous={prior[revenue]} /></dd></div>
          <div><dt>{index===2?"Total ROAS":"ROAS"}</dt><dd>{formatRatio(now[roas])}<ComparisonValueDelta metric="roas" value={now[roas]} previous={prior[roas]} /></dd></div>
          {index===2&&<div><dt>Orders</dt><dd>{formatCount(now.orders)}<ComparisonValueDelta metric="orders" value={now.orders} previous={prior.orders} /></dd></div>}
        </dl>
      </article>)}
    </div>
    {rows.length > 0 && <div className={styles.chartGrid}>
      {(["spend", "revenue", "roas", "funnel", "orders"] as const).map(metric =>
        <MarketTrend key={metric} metric={metric} rows={rows} marketCount={marketCount} range={current} />)}
    </div>}
  </section>;
}

export function LocalizationReview({ snapshot }: { snapshot: MarketSnapshot | null }) {
  const { language } = useSiteLanguage();
  const zh = language === "zh";
  const t = (en: string, cn: string) => zh ? cn : en;
  const label = (market: Market) => markets[market][zh ? 1 : 0];
  const [reviewMarket, setReviewMarket] = useState<Market>("NL");
  const rows = snapshot?.rows.filter(row => row.market === reviewMarket) ?? [];
  const daysBetween = (later: string, earlier: string) => Math.round((Date.parse(later) - Date.parse(earlier)) / 86_400_000);
  const maxDays = Math.max(0, Math.min(daysBetween(launch, firstDay), daysBetween(snapshot?.through ?? launch, launch)));
  const [windowDays, setWindowDays] = useState(7);
  const days = Math.min(windowDays, maxDays);
  const offsets = Array.from({ length: days }, (_, index) => index + 1);
  const groups = [
    { offsets: offsets.map(offset => offset - days - 1), title: t("Pre-launch summary", "上线前汇总") },
    { offsets, title: t("Post-launch summary", "上线后汇总") },
  ].map(({ offsets, title }) => {
    const dates = offsets.map(offset => dayOffset(launch, offset));
    return { title, records: [
      ...dates.map(date => ({ label: date, totals: summarize(rows, date, date), summary: false })),
      { label: title, totals: dates.length ? summarize(rows, dates[0], dates[dates.length - 1]) : summarize([], launch, launch), summary: true },
    ] };
  });

  return <div className={styles.shell}>
    <header className={nova.header}>
      <h1>{t("Nov 13 Localization review", "11 月 13 日本地化复盘")}</h1>
      {snapshot?.demo && <p className={styles.muted}>{t("Local preview · Sample data", "本地预览 · 示例数据")}</p>}
      <div className={styles.marketPicker} role="group" aria-labelledby="localization-market-label">
        <span id="localization-market-label" className={nova.periodLabel}>{t("Localization market", "本地化市场")}</span>
        <div className={nova.controls}>
          {marketCodes.filter(market => market !== "GB").map(market =>
            <NovaButton key={market} type="button" variant={market === reviewMarket ? "default" : "outline"}
              aria-pressed={market === reviewMarket} onClick={() => setReviewMarket(market)}>{label(market)}</NovaButton>)}
        </div>
      </div>
    </header>
      <section id="localization-review" className={styles.panel} aria-labelledby="localization-review-title">
        <header className={styles.panelHeader}>
          <div><h2 id="localization-review-title">{label(reviewMarket)} · {t("Before and after launch", "上线前后对比")}</h2><p>{t(`November 13 launch · ${days} complete days on each side`, `11 月 13 日上线 · 对比前后各 ${days} 个完整日`)}</p></div>
          {maxDays > 0 && <form key={maxDays} className={styles.chartFilters} onSubmit={event => {
            event.preventDefault();
            const value = Number(new FormData(event.currentTarget).get("days"));
            if (Number.isInteger(value) && value >= 1 && value <= maxDays) setWindowDays(value);
          }}>
            <label htmlFor="localization-window-days" className={nova.periodLabel}>
              {t(`Days on each side (1–${maxDays})`, `上线前后各几天（1–${maxDays}）`)}
            </label>
            <input id="localization-window-days" className={`${nova.selectTrigger} ${styles.windowDaysInput}`}
              name="days" type="number" min={1} max={maxDays} step={1} required defaultValue={days} />
            <NovaButton type="submit" variant="outline">{t("Apply", "应用")}</NovaButton>
          </form>}
        </header>
        <div className={styles.tableWrap} tabIndex={0} role="region" aria-labelledby="localization-review-title">
          <table>
            <thead><tr><th scope="col">{t("Date", "日期")}</th>{reviewColumns.map(([key, name]) => <th key={key} scope="col">{name}</th>)}</tr></thead>
            {groups.map(({ title, records }) => <tbody key={title}>
              {records.map(({ label, totals, summary }) => <tr key={label} className={summary ? styles.reviewSummary : undefined}>
                <th scope="row">{label}</th><td>{formatMoney(totals.spend)}</td><td>{formatMoney(totals.sales)}</td>
                <td>{formatCount(totals.orders)}</td><td>{formatPercent(totals.cvr)}</td><td>{formatRatio(totals.roas)}</td>
              </tr>)}
            </tbody>)}
          </table>
        </div>
      </section>
  </div>;
}

export default function MarketOverview({ snapshot, view }: { snapshot: MarketSnapshot | null; view: "overview" | "united-kingdom" | "market-comparison" }) {
  const ukOnly = view === "united-kingdom";

  const { language } = useSiteLanguage();
  const zh = language === "zh";
  const t = (en: string, cn: string) => zh ? cn : en;
  const label = (market: Market) => markets[market][zh ? 1 : 0];
  const [period, setPeriod] = useState("last7");
  const [compare, setCompare] = useState("previousPeriod");
  const [custom, setCustom] = useState<{main?:ComparisonRange;compare?:ComparisonRange}>({});
  const through = snapshot?.through ?? firstDay;
  const preset = (key: string): ComparisonRange => {
    const selection = novaReportingPeriods.find(([value]) => value === key)?.[0] ?? "last7";
    const range = resolveTestingPeriod(through, { preset: selection });
    return {
      start: range.start < firstDay && range.end >= firstDay ? firstDay : range.start,
      end: range.end > through ? through : range.end,
    };
  };
  const current = period === "custom" ? custom.main ?? preset("last7") : preset(period);
  const previous = compare === "custom" ? custom.compare ?? comparisonRange(current,"previousPeriod",through)
    : compare === "previousPeriod" || compare === "previousYear" ? comparisonRange(current,compare,through) : preset(compare);
  const {start,end}=current;
  const source = (market: Market) => snapshot?.rows.filter((row) => row.market === market) ?? [];
  const marketRows = marketCodes.map((market) => ({ market, ...summarize(source(market), start, end) }));
  const baseline = (market: Market) => summarize(source(market), previous.start, previous.end);
  const validRange = Boolean(start && end && start >= firstDay && start <= end && end <= through);
  return <div className={styles.shell}>
    <header className={nova.header}>
      <h1>{ukOnly ? t("United Kingdom performance", "英国市场表现") : view === "market-comparison" ? t("7-market comparison", "七国市场对比") : t("Market overview", "市场总览")}</h1>
      {snapshot?.demo && <p className={styles.muted}>{t("Local preview · Sample data", "本地预览 · 示例数据")}</p>}
      <div className={nova.controls}>
        <DashboardPeriodComparison main={{range:current,options:novaReportingPeriods,value:period}} compare={{range:previous,options:dashboardComparisonOptions(zh),value:compare}}
          onChoose={(which,value) => {
            if (value === "custom") setCustom((ranges) => ({...ranges,[which]:which === "main" ? current : previous}));
            if (which === "main") setPeriod(value); else setCompare(value);
          }}
          onApply={(which,range) => setCustom((ranges) => ({...ranges,[which]:range}))}
          onSwap={() => { setCustom({main:previous,compare:current}); setPeriod("custom"); setCompare("custom"); }}
          validateRange={(range) => range.end > through ? t(`Choose dates through ${through}.`, `请选择 ${through} 及之前的日期。`) : undefined} />
        <MarketAskAi start={start} end={end} comparison={previous} period={period} latest={through} market={ukOnly ? "GB" : undefined} disabled={!snapshot || snapshot.demo || !validRange} />
      </div>
    </header>
      {!snapshot && <p className={styles.muted} role="status">{t("The Biceek data snapshot is unavailable.", "Biceek 数据快照暂不可用。")}</p>}

      {view==="overview"&&<PerformanceSection id="total-performance" title={t("Total performance · 7 markets", "总表现 · 七国市场")}
        rows={snapshot?.rows ?? []} marketCount={marketCodes.length} current={current} previous={previous} />}
      {view!=="market-comparison"&&<PerformanceSection id="uk-performance" title={ukOnly ? t("Performance summary", "表现摘要") : t("United Kingdom performance", "英国市场表现")}
        rows={source("GB")} marketCount={1} current={current} previous={previous}
        link={ukOnly ? undefined : "/biceek/overview/united-kingdom"} linkLabel={t("View UK dashboard", "查看英国仪表盘")} />}
      {view==="market-comparison"&&<section id="market-comparison" className={styles.panel} aria-labelledby="market-comparison-title">
        <header className={styles.panelHeader}><h2 id="market-comparison-title">{t("7-market comparison", "七国市场对比")}</h2></header>
        <div className={styles.tableWrap} tabIndex={0} role="region" aria-labelledby="market-comparison-title">
          <MetricSortScope defaultRoas><table>
            <thead>
              <tr><th rowSpan={2} scope="col">{t("Market", "市场")}</th><th colSpan={3} scope="colgroup">Google Ads</th><th colSpan={3} scope="colgroup">Meta Ads</th><th colSpan={4} scope="colgroup">Shopify / Total</th></tr>
              <tr>{comparisonColumns.map(([key, name, channel]) => <MetricSortHeader key={key} metric={key} label={name}
                accessibleLabel={channel ? `${channel} ${name}` : undefined} />)}</tr>
            </thead>
            <MetricSortedRows as="tbody" rows={marketRows.map((row) => ({ id: row.market, name: markets[row.market][0], values: {...row, market: undefined}, content: <tr data-uk={row.market === "GB"}>
              <th scope="row">{label(row.market)}</th>
              <td>{formatMoney(row.googleSpend)}</td><td>{formatMoney(row.googleRevenue)}</td><td>{formatRatio(row.googleRoas)}</td>
              <td>{formatMoney(row.metaSpend)}</td><td>{formatMoney(row.metaRevenue)}</td><td>{formatRatio(row.metaRoas)}</td>
              <td>{formatMoney(row.spend)}</td><td>{formatMoney(row.sales)}</td><td>{formatCount(row.orders)}</td><td>{formatRatio(row.roas)}<ComparisonValueDelta metric="roas" value={row.roas} previous={baseline(row.market).roas} /></td>
            </tr> }))} />
          </table></MetricSortScope>
        </div>
      </section>}
      <details className={styles.notes}><summary>{t("Metric definitions & data coverage", "指标定义与数据覆盖")}</summary>
        <p>{t("Overview totals cover the seven reported markets. Total ROAS is Shopify Total Sales divided by Google and Meta spend. Channel ROAS uses that platform’s attributed purchase revenue. A dash indicates a missing metric or a ROAS without positive spend.",
          "总览合计覆盖七个报告市场。Total ROAS 为 Shopify Total Sales 除以 Google 和 Meta 花费之和。渠道 ROAS 使用该平台归因的购买收入。破折号表示数据缺失，或没有正花费可计算 ROAS。")}</p>
        <p>{t("Google uses user location and Pacific reporting dates. Meta uses country breakdown with Eastern reporting dates. Shopify uses shipping country and Pacific reporting dates.",
          "Google 按用户所在地和美西报表日期统计。Meta 按国家和美东报表日期统计。Shopify 按收货国和美西报表日期统计。")}</p>
      </details>
  </div>;
}
