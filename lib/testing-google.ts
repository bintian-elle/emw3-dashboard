import "server-only";
import { connection } from "next/server";
import { db } from "@/lib/db";

const GOOGLE_SEARCH_CAMPAIGN = "EM-Search-Nonbrand-Purchase-Apr26";

type GoogleTestRow = {
  ad_group_name: string;
  ad_group_id: string;
  period_start: string;
  period_end: string;
  spend: string;
  revenue: string;
  orders: string;
  impressions: string;
  clicks: string;
};

export type GoogleTestGroup = {
  label: "Group A" | "Group B";
  name: string;
  adGroupId: string;
  spend: number;
  revenue: number;
  orders: number;
  impressions: number;
  clicks: number;
  cpa: number | null;
  cvr: number | null;
  roas: number | null;
  ctr: number | null;
  cpc: number | null;
};

export type GoogleSearchTest = {
  campaignName: string;
  periodLabel: string;
  period: { start: string; end: string } | null;
  groups: GoogleTestGroup[];
};

export type TestingPeriodPreset = "lastWeek" | "wtd" | "mtd" | "ytd" | "last7" | "last30" | "last90" | "custom";

export type TestingPeriodInput = {
  preset?: TestingPeriodPreset;
  start?: string;
  end?: string;
};

export const testingPeriodLabels:Record<TestingPeriodPreset,string>={lastWeek:"Last Week (Tue–Mon)",wtd:"Week-to-date",mtd:"Month-to-date",ytd:"Year-to-date",last7:"Last 7 days",last30:"Last 30 days",last90:"Last 90 days",custom:"Custom"};

export function testingPeriodInput(params:{period?:string|string[];start?:string|string[];end?:string|string[]}):TestingPeriodInput {
  const rawPeriod=Array.isArray(params.period)?params.period[0]:params.period;
  const preset=(rawPeriod&&rawPeriod in testingPeriodLabels?rawPeriod:"lastWeek") as TestingPeriodPreset;
  return {preset,start:Array.isArray(params.start)?params.start[0]:params.start,end:Array.isArray(params.end)?params.end[0]:params.end};
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

const iso = (date:Date) => date.toISOString().slice(0,10);
const moveDays = (value:string,days:number) => { const date=new Date(`${value}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return iso(date); };
const validDate = (value?:string) => Boolean(value&&/^\d{4}-\d{2}-\d{2}$/.test(value));

export function resolveTestingPeriod(latest:string,input:TestingPeriodInput) {
  const preset=input.preset??"lastWeek";
  if(preset==="custom"&&validDate(input.start)&&validDate(input.end)) {
    const end=input.end!>latest?latest:input.end!;
    return {start:input.start!<=end?input.start!:end,end};
  }
  if(preset==="last7")return {start:moveDays(latest,-6),end:latest};
  if(preset==="last30")return {start:moveDays(latest,-29),end:latest};
  if(preset==="last90")return {start:moveDays(latest,-89),end:latest};
  const latestDate=new Date(`${latest}T12:00:00Z`);
  if(preset==="mtd")return {start:iso(new Date(Date.UTC(latestDate.getUTCFullYear(),latestDate.getUTCMonth(),1))),end:latest};
  if(preset==="ytd")return {start:iso(new Date(Date.UTC(latestDate.getUTCFullYear(),0,1))),end:latest};
  const today=moveDays(latest,1);
  const todayDate=new Date(`${today}T12:00:00Z`);
  const daysSinceTuesday=(todayDate.getUTCDay()+5)%7;
  const currentTuesday=moveDays(today,-daysSinceTuesday);
  if(preset==="wtd")return {start:currentTuesday,end:latest};
  return {start:moveDays(currentTuesday,-7),end:moveDays(currentTuesday,-1)};
}

export async function getGoogleSearchTest(input:TestingPeriodInput={}): Promise<GoogleSearchTest> {
  await connection();
  const latestResult=await db.query<{latest_date:string}>(`
    SELECT MAX(f.date)::text AS latest_date
    FROM fact_ad_group_daily f
    JOIN dim_campaign c USING (customer_id, campaign_id)
    WHERE c.campaign_name=$1 AND f.date<CURRENT_DATE
  `,[GOOGLE_SEARCH_CAMPAIGN]);
  const preset=input.preset??"lastWeek";
  if(!latestResult.rows[0]?.latest_date)return {campaignName:GOOGLE_SEARCH_CAMPAIGN,periodLabel:testingPeriodLabels[preset],period:null,groups:[]};
  const period=resolveTestingPeriod(latestResult.rows[0].latest_date,input);
  const result = await db.query<GoogleTestRow>(`
    SELECT
      g.ad_group_name,
      g.ad_group_id,
      MIN(f.date)::text AS period_start,
      MAX(f.date)::text AS period_end,
      SUM(f.cost_micros) / 1000000.0 AS spend,
      SUM(f.conversions_value) AS revenue,
      SUM(f.conversions) AS orders,
      SUM(f.impressions) AS impressions,
      SUM(f.clicks) AS clicks
    FROM fact_ad_group_daily f
    JOIN dim_campaign c USING (customer_id, campaign_id)
    JOIN dim_ad_group g USING (customer_id, campaign_id, ad_group_id)
    WHERE c.campaign_name = $1
      AND f.date BETWEEN $2::date AND $3::date
    GROUP BY g.ad_group_name, g.ad_group_id
    ORDER BY CASE g.ad_group_name
      WHEN 'countertop ro' THEN 1
      WHEN 'countertop water filter' THEN 2
      ELSE 3
    END, g.ad_group_name
  `, [GOOGLE_SEARCH_CAMPAIGN,period.start,period.end]);

  const groups = result.rows.slice(0, 2).map((row, index) => {
    const spend = Number(row.spend);
    const revenue = Number(row.revenue);
    const orders = Number(row.orders);
    const impressions = Number(row.impressions);
    const clicks = Number(row.clicks);

    return {
      label: index === 0 ? "Group A" as const : "Group B" as const,
      name: row.ad_group_name,
      adGroupId: row.ad_group_id,
      spend,
      revenue,
      orders,
      impressions,
      clicks,
      cpa: ratio(spend, orders),
      cvr: ratio(orders, clicks),
      roas: ratio(revenue, spend),
      ctr: ratio(clicks, impressions),
      cpc: ratio(spend, clicks),
    };
  });

  return {
    campaignName: GOOGLE_SEARCH_CAMPAIGN,
    periodLabel: testingPeriodLabels[preset],
    period,
    groups,
  };
}
