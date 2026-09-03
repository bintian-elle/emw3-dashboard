import "server-only";
import { db } from "@/lib/db";
import type { BrandKeywordRow, ComparisonMode, DashboardMetric, DashboardRow, GoogleAdsDashboardData, ProductRow } from "@/lib/google-ads-types";

type PeriodTotals = {
  cost: number; revenue: number; conversions: number; impressions: number;
  clicks: number; impressionShare: number | null;
};

const asNumber = (value: unknown) => Number(value ?? 0);
const ratio = (numerator: number, denominator: number) => denominator ? numerator / denominator : null;
const change = (current: number | null, prior: number | null) => current == null || prior == null || prior === 0 ? null : ((current / prior) - 1) * 100;
const iso = (date: Date) => date.toISOString().slice(0, 10);
const shiftDays = (date: string, days: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return iso(d); };
const shiftYear = (date: string, years: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCFullYear(d.getUTCFullYear() + years); return iso(d); };

async function getTotals(customerId: string, start: string, end: string): Promise<PeriodTotals> {
  const { rows } = await db.query(`
    SELECT
      COALESCE(SUM(cost_micros), 0) / 1000000.0 AS cost,
      COALESCE(SUM(conversions_value), 0) AS revenue,
      COALESCE(SUM(conversions), 0) AS conversions,
      COALESCE(SUM(impressions), 0) AS impressions,
      COALESCE(SUM(clicks), 0) AS clicks,
      CASE WHEN SUM(impressions) > 0
        THEN SUM(search_impression_share * impressions) / SUM(impressions)
      END AS impression_share
    FROM fact_account_daily
    WHERE customer_id = $1 AND date BETWEEN $2::date AND $3::date
  `, [customerId, start, end]);
  return {
    cost: asNumber(rows[0].cost), revenue: asNumber(rows[0].revenue),
    conversions: asNumber(rows[0].conversions), impressions: asNumber(rows[0].impressions),
    clicks: asNumber(rows[0].clicks), impressionShare: rows[0].impression_share == null ? null : asNumber(rows[0].impression_share),
  };
}

function makeMetrics(current: PeriodTotals, prior: PeriodTotals): DashboardMetric[] {
  const values = [
    { label: "Spend", value: current.cost, priorValue: prior.cost, format: "currency" as const, inverse: true },
    { label: "Revenue", value: current.revenue, priorValue: prior.revenue, format: "currency" as const },
    { label: "ROAS", value: ratio(current.revenue, current.cost), priorValue: ratio(prior.revenue, prior.cost), format: "ratio" as const },
    { label: "Impressions", value: current.impressions, priorValue: prior.impressions, format: "compact" as const },
    { label: "Clicks", value: current.clicks, priorValue: prior.clicks, format: "compact" as const },
    { label: "CTR", value: ratio(current.clicks, current.impressions), priorValue: ratio(prior.clicks, prior.impressions), format: "percent" as const },
    { label: "Conversions", value: current.conversions, priorValue: prior.conversions, format: "number" as const },
    { label: "CVR", value: ratio(current.conversions, current.clicks), priorValue: ratio(prior.conversions, prior.clicks), format: "percent" as const },
    { label: "CPA", value: ratio(current.cost, current.conversions), priorValue: ratio(prior.cost, prior.conversions), format: "currency" as const, inverse: true },
    { label: "AOV", value: ratio(current.revenue, current.conversions), priorValue: ratio(prior.revenue, prior.conversions), format: "currency" as const },
    { label: "Impression share", value: current.impressionShare, priorValue: prior.impressionShare, format: "percent" as const },
  ];
  return values.map(metric => ({ ...metric, delta: change(metric.value, metric.priorValue) }));
}

function mapRows(rows: Record<string, unknown>[]): DashboardRow[] {
  return rows.map(row => {
    const cost = asNumber(row.cost); const revenue = asNumber(row.revenue);
    const impressions = asNumber(row.impressions); const clicks = asNumber(row.clicks);
    return { name: String(row.name ?? "Unknown"), cost, revenue, roas: ratio(revenue, cost), conversions: asNumber(row.conversions), impressions, clicks, ctr: ratio(clicks, impressions), impressionShare: row.impression_share == null ? undefined : asNumber(row.impression_share), delta: row.delta == null ? undefined : asNumber(row.delta), absChange: row.abs_change == null ? undefined : asNumber(row.abs_change) };
  });
}

function mapBrandRows(rows: Record<string, unknown>[]): BrandKeywordRow[] {
  const values = rows.map(row => ({ name:String(row.name), cost:asNumber(row.cost), revenue:asNumber(row.revenue), conversions:asNumber(row.conversions), impressions:asNumber(row.impressions), clicks:asNumber(row.clicks), priorCost:asNumber(row.prior_cost), priorRevenue:asNumber(row.prior_revenue), priorConversions:asNumber(row.prior_conversions), priorImpressions:asNumber(row.prior_impressions), priorClicks:asNumber(row.prior_clicks) }));
  const make = (item: typeof values[number], isTotal=false): BrandKeywordRow => {
    const roas=ratio(item.revenue,item.cost), priorRoas=ratio(item.priorRevenue,item.priorCost), ctr=ratio(item.clicks,item.impressions), priorCtr=ratio(item.priorClicks,item.priorImpressions), cvr=ratio(item.conversions,item.clicks), priorCvr=ratio(item.priorConversions,item.priorClicks), cpa=ratio(item.cost,item.conversions), priorCpa=ratio(item.priorCost,item.priorConversions), aov=ratio(item.revenue,item.conversions), priorAov=ratio(item.priorRevenue,item.priorConversions);
    return { name:item.name,cost:item.cost,revenue:item.revenue,roas,conversions:item.conversions,impressions:item.impressions,clicks:item.clicks,ctr,cvr,cpa,aov,isTotal,deltas:{cost:change(item.cost,item.priorCost),revenue:change(item.revenue,item.priorRevenue),roas:change(roas,priorRoas),conversions:change(item.conversions,item.priorConversions),impressions:change(item.impressions,item.priorImpressions),clicks:change(item.clicks,item.priorClicks),ctr:change(ctr,priorCtr),cvr:change(cvr,priorCvr),cpa:change(cpa,priorCpa),aov:change(aov,priorAov)} };
  };
  const top=values.sort((a,b)=>b.conversions-a.conversions).slice(0,3).map(item=>make(item));
  const total=values.reduce((sum,item)=>({name:"Total Brand",cost:sum.cost+item.cost,revenue:sum.revenue+item.revenue,conversions:sum.conversions+item.conversions,impressions:sum.impressions+item.impressions,clicks:sum.clicks+item.clicks,priorCost:sum.priorCost+item.priorCost,priorRevenue:sum.priorRevenue+item.priorRevenue,priorConversions:sum.priorConversions+item.priorConversions,priorImpressions:sum.priorImpressions+item.priorImpressions,priorClicks:sum.priorClicks+item.priorClicks}),{name:"Total Brand",cost:0,revenue:0,conversions:0,impressions:0,clicks:0,priorCost:0,priorRevenue:0,priorConversions:0,priorImpressions:0,priorClicks:0});
  return values.length ? [...top,make(total,true)] : [];
}

function mapProductRows(rows: Record<string, unknown>[]): ProductRow[] {
  return rows.map(row=>{
    const name=String(row.name??row.sku??"Unknown product");
    const sku=String(row.sku??"—");
    const cost=asNumber(row.cost),revenue=asNumber(row.revenue),conversions=asNumber(row.conversions),impressions=asNumber(row.impressions),clicks=asNumber(row.clicks);
    return {name,sku,brand:row.brand?String(row.brand):null,imageUrl:row.image_url?String(row.image_url):null,cost,revenue,roas:ratio(revenue,cost),conversions,impressions,clicks,ctr:ratio(clicks,impressions)};
  });
}

export async function getGoogleAdsDashboard(options: { days?: number; comparison?: ComparisonMode; start?: string; end?: string; brandFilter?: string; searchTermSort?: "spend"|"conversions"|"spend_movers"|"conversion_movers" } = {}): Promise<GoogleAdsDashboardData> {
  let days = [7, 14, 30, 90].includes(options.days ?? 30) ? (options.days ?? 30) : 30;
  const mode: ComparisonMode = options.comparison === "YOY" ? "YOY" : "POP";
  const brandFilter = (options.brandFilter?.trim() || "blu").slice(0,50);
  const searchTermOrder = options.searchTermSort === "spend" ? "cost DESC, conversions DESC" : options.searchTermSort?.endsWith("_movers") ? "abs_change DESC NULLS LAST, conversions DESC" : "conversions DESC, cost DESC";
  const moverDelta = options.searchTermSort === "spend_movers" ? "CASE WHEN p.prior_cost<>0 THEN (c.cost/p.prior_cost-1)*100 END" : options.searchTermSort === "conversion_movers" ? "CASE WHEN p.prior_conversions<>0 THEN (c.conversions/p.prior_conversions-1)*100 END" : "NULL::numeric";
  const moverAbsChange = options.searchTermSort === "spend_movers" ? "CASE WHEN p.name IS NOT NULL THEN ABS(c.cost-p.prior_cost) END" : options.searchTermSort === "conversion_movers" ? "CASE WHEN p.name IS NOT NULL THEN ABS(c.conversions-p.prior_conversions) END" : "NULL::numeric";
  const latest = await db.query(`SELECT customer_id, MAX(date)::text AS latest_date, COALESCE(MAX(date) FILTER (WHERE date < CURRENT_DATE), MAX(date))::text AS complete_date FROM fact_account_daily GROUP BY customer_id ORDER BY MAX(date) DESC LIMIT 1`);
  if (!latest.rows[0]) throw new Error("No Google Ads account data found");
  const customerId = String(latest.rows[0].customer_id);
  const latestDate = String(latest.rows[0].latest_date);
  const completeDate = String(latest.rows[0].complete_date);
  const requestedEnd = options.end && /^\d{4}-\d{2}-\d{2}$/.test(options.end) ? options.end : completeDate;
  const end = requestedEnd > completeDate ? completeDate : requestedEnd;
  const explicitStart = options.start && /^\d{4}-\d{2}-\d{2}$/.test(options.start) ? options.start : undefined;
  const start = explicitStart && explicitStart <= end ? explicitStart : shiftDays(end, -(days - 1));
  days = Math.round((new Date(`${end}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()) / 86_400_000) + 1;
  const priorStart = mode === "YOY" ? shiftYear(start, -1) : shiftDays(start, -days);
  const priorEnd = mode === "YOY" ? shiftYear(end, -1) : shiftDays(start, -1);

  const [current, prior, channelResult, searchResult, brandResult, trendResult, productsResult] = await Promise.all([
    getTotals(customerId, start, end), getTotals(customerId, priorStart, priorEnd),
    db.query(`SELECT COALESCE(NULLIF(c.advertising_channel_type,''),'OTHER') AS name, SUM(f.cost_micros)/1000000.0 cost, SUM(f.conversions_value) revenue, SUM(f.conversions) conversions, SUM(f.impressions) impressions, SUM(f.clicks) clicks, CASE WHEN SUM(f.impressions)>0 THEN SUM(f.search_impression_share*f.impressions)/SUM(f.impressions) END impression_share FROM fact_campaign_daily f JOIN dim_campaign c USING (customer_id,campaign_id) WHERE f.customer_id=$1 AND f.date BETWEEN $2::date AND $3::date GROUP BY 1 ORDER BY cost DESC`, [customerId,start,end]),
    db.query(`WITH current_period AS (SELECT search_term AS name, SUM(cost_micros)/1000000.0 cost, SUM(conversions_value) revenue, SUM(conversions) conversions, SUM(impressions) impressions, SUM(clicks) clicks FROM fact_search_term_daily WHERE customer_id=$1 AND date BETWEEN $2::date AND $3::date AND ((brand_classification IS NULL AND search_term NOT ILIKE '%blu%') OR UPPER(brand_classification) NOT IN ('BRAND','BRANDED')) GROUP BY search_term), prior_period AS (SELECT search_term AS name, SUM(cost_micros)/1000000.0 prior_cost, SUM(conversions) prior_conversions FROM fact_search_term_daily WHERE customer_id=$1 AND date BETWEEN $4::date AND $5::date AND ((brand_classification IS NULL AND search_term NOT ILIKE '%blu%') OR UPPER(brand_classification) NOT IN ('BRAND','BRANDED')) GROUP BY search_term) SELECT c.*,${moverDelta} delta,${moverAbsChange} abs_change FROM current_period c LEFT JOIN prior_period p USING(name) ORDER BY ${searchTermOrder} LIMIT 5`, [customerId,start,end,priorStart,priorEnd]),
    db.query(`WITH current_period AS (SELECT k.keyword_text name, SUM(f.cost_micros)/1000000.0 cost, SUM(f.conversions_value) revenue, SUM(f.conversions) conversions, SUM(f.impressions) impressions, SUM(f.clicks) clicks FROM fact_keyword_daily f JOIN dim_keyword k USING (customer_id,campaign_id,ad_group_id,criterion_id) WHERE f.customer_id=$1 AND f.date BETWEEN $2::date AND $3::date AND k.keyword_text ILIKE '%'||$6||'%' GROUP BY k.keyword_text), prior_period AS (SELECT k.keyword_text name, SUM(f.cost_micros)/1000000.0 prior_cost, SUM(f.conversions_value) prior_revenue, SUM(f.conversions) prior_conversions, SUM(f.impressions) prior_impressions, SUM(f.clicks) prior_clicks FROM fact_keyword_daily f JOIN dim_keyword k USING (customer_id,campaign_id,ad_group_id,criterion_id) WHERE f.customer_id=$1 AND f.date BETWEEN $4::date AND $5::date AND k.keyword_text ILIKE '%'||$6||'%' GROUP BY k.keyword_text) SELECT c.*,COALESCE(p.prior_cost,0) prior_cost,COALESCE(p.prior_revenue,0) prior_revenue,COALESCE(p.prior_conversions,0) prior_conversions,COALESCE(p.prior_impressions,0) prior_impressions,COALESCE(p.prior_clicks,0) prior_clicks FROM current_period c LEFT JOIN prior_period p USING(name)`, [customerId,start,end,priorStart,priorEnd,brandFilter]),
    db.query(`SELECT date::text date, SUM(cost_micros)/1000000.0 cost, SUM(conversions_value) revenue FROM fact_account_daily WHERE customer_id=$1 AND date BETWEEN $2::date AND $3::date GROUP BY date ORDER BY date`, [customerId,start,end]),
    db.query(`SELECT COALESCE(NULLIF(product_title,''),product_item_id) name,product_item_id sku,MAX(NULLIF(product_brand,'')) brand,MAX(NULLIF(image_url,'')) image_url,SUM(cost_micros)/1000000.0 cost,SUM(conversions_value) revenue,SUM(conversions) conversions,SUM(impressions) impressions,SUM(clicks) clicks FROM v_product_performance_daily WHERE customer_id=$1 AND date BETWEEN $2::date AND $3::date GROUP BY product_item_id,product_title ORDER BY conversions DESC,cost DESC LIMIT 5`, [customerId,start,end]),
  ]);

  return { customerId, latestDate, availableThrough:completeDate, brandFilter, range:{start,end,days}, comparison:{mode,start:priorStart,end:priorEnd}, metrics:makeMetrics(current,prior), channels:mapRows(channelResult.rows), searchTerms:mapRows(searchResult.rows), brandKeywords:mapBrandRows(brandResult.rows), products:mapProductRows(productsResult.rows), trend:trendResult.rows.map(row=>({date:String(row.date),cost:asNumber(row.cost),revenue:asNumber(row.revenue)})) };
}
