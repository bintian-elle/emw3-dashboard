import {readGoogleTestingDatabase} from "@/lib/google-testing-db-fallback";
import "server-only";
import { connection } from "next/server";
import {resolveTestingPeriod} from "@/lib/testing-period";
export {resolveTestingPeriod} from "@/lib/testing-period";
import {readGoogleTestingApiData,apiGoogleSearchReport,readGoogleSearchSharedSnapshot} from "@/lib/google-testing-api";
import {googleContentTestingInventory,GOOGLE_CONTENT_CAMPAIGNS} from "@/lib/google-content-testing-scope";
import { db } from "@/lib/db";

export const googleContentTestingCampaigns = GOOGLE_CONTENT_CAMPAIGNS;

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
  label: "Group A" | "Group B" | "";
  name: string;
  adGroupId: string;
  spend: number;
  revenue: number;
  orders: number;
  impressions: number | null;
  clicks: number;
  cpa: number | null;
  cvr: number | null;
  roas: number | null;
  ctr: number | null;
  cpc: number | null;
};

export type GoogleSearchTest = {
  channel?: "search" | "pmax" | "demand-gen";
  creativeType?:"Message"|"Picture"|"Video"|"Mixed";
  campaignName: string;
  adCount?:number;
  reach?:number|null;
  campaignStatus: string;
  /** Earliest recorded activity for the test groups, independent of reporting range. */
  testingStartDate?: string | null;
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


export async function getGoogleSearchTest(input:TestingPeriodInput={},campaignName:string=GOOGLE_SEARCH_CAMPAIGN,allAdGroups=false): Promise<GoogleSearchTest> {
  await connection();
  const latestResult=await db.query<{latest_date:string;campaign_status:string;testing_start_date:string}>(`
    SELECT MAX(f.date)::text AS latest_date, MAX(c.campaign_status) AS campaign_status,
      MIN(f.date) FILTER (WHERE $2::boolean OR f.ad_group_id IN (
        SELECT ad_group_id FROM dim_ad_group WHERE ad_group_name IN ('countertop ro','countertop water filter')
      ))::text AS testing_start_date
    FROM fact_ad_group_daily f
    JOIN dim_campaign c USING (customer_id, campaign_id)
    WHERE c.campaign_name=$1 AND f.date<CURRENT_DATE
  `,[campaignName,allAdGroups]);
  const preset=input.preset??"lastWeek";
  if(!latestResult.rows[0]?.latest_date&&allAdGroups){const period=resolveTestingPeriod(new Date(Date.now()-86400000).toISOString().slice(0,10),input);return apiGoogleSearchReport(await readGoogleTestingApiData(),campaignName,period,testingPeriodLabels[preset]);}
  if(!latestResult.rows[0]?.latest_date)return {campaignName,campaignStatus:latestResult.rows[0]?.campaign_status??"Unknown",periodLabel:testingPeriodLabels[preset],period:null,groups:[]};
  const latest=new Date(Date.now()-86400000).toISOString().slice(0,10);
  const period=resolveTestingPeriod(latest,input);
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
    FROM dim_ad_group g
    JOIN dim_campaign c USING (customer_id, campaign_id)
    LEFT JOIN fact_ad_group_daily f ON f.customer_id=g.customer_id
      AND f.campaign_id=g.campaign_id AND f.ad_group_id=g.ad_group_id
      AND f.date BETWEEN $2::date AND $3::date
    WHERE c.campaign_name = $1 AND ($4::boolean OR f.ad_group_id IS NOT NULL)
    GROUP BY g.ad_group_name, g.ad_group_id
    ORDER BY CASE g.ad_group_name
      WHEN 'countertop ro' THEN 1
      WHEN 'countertop water filter' THEN 2
      ELSE 3
    END, g.ad_group_name
  `, [campaignName,period.start,period.end,allAdGroups]);

  if(allAdGroups&&(latestResult.rows[0].latest_date<period.end||!result.rows.some(row=>row.period_start))){
    return apiGoogleSearchReport(await readGoogleTestingApiData(),campaignName,period,testingPeriodLabels[preset],result.rows.map(row=>({name:row.ad_group_name,id:row.ad_group_id})),latestResult.rows[0].testing_start_date);
  }
  const groups = (allAdGroups?result.rows:result.rows.slice(0, 2)).map((row, index) => {
    const spend = Number(row.spend);
    const revenue = Number(row.revenue);
    const orders = Number(row.orders);
    const impressions = Number(row.impressions);
    const clicks = Number(row.clicks);

    return {
      label: allAdGroups ? "" as const : index === 0 ? "Group A" as const : "Group B" as const,
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
    campaignName: campaignName,
    campaignStatus: latestResult.rows[0].campaign_status,
    testingStartDate: latestResult.rows[0].testing_start_date,
    periodLabel: testingPeriodLabels[preset],
    period,
    groups,
  };
}

export async function getGoogleContentTests(input:TestingPeriodInput={}) {
 await connection();
 const shared=await readGoogleSearchSharedSnapshot();
 const inventory=shared?.inventory??await googleContentTestingInventory();
 const period=resolveTestingPeriod(new Date(Date.now()-86400000).toISOString().slice(0,10),input);
 const periodLabel=testingPeriodLabels[input.preset??"lastWeek"];
 const ids=inventory.ads.map(row=>row.adGroupAd.ad.id),allowed=new Set(ids);
 type ScopedRow={ad_group_id:string;testing_start_date:string;latest_date:string;spend:string;revenue:string;orders:string;impressions:string;clicks:string};
 const result=!shared&&ids.length?await readGoogleTestingDatabase(()=>db.query<ScopedRow>(`SELECT ad_group_id,MIN(date)::text testing_start_date,MAX(date)::text latest_date,
 COALESCE(SUM(spend) FILTER(WHERE date BETWEEN $2::date AND $3::date),0) spend,
 COALESCE(SUM(conversions_value) FILTER(WHERE date BETWEEN $2::date AND $3::date),0) revenue,
 COALESCE(SUM(conversions) FILTER(WHERE date BETWEEN $2::date AND $3::date),0) orders,
 COALESCE(SUM(impressions) FILTER(WHERE date BETWEEN $2::date AND $3::date),0) impressions,
 COALESCE(SUM(clicks) FILTER(WHERE date BETWEEN $2::date AND $3::date),0) clicks
 FROM v_ad_performance_daily WHERE ad_id=ANY($1::text[]) AND date<CURRENT_DATE GROUP BY ad_group_id`,[ids,period.start,period.end])):{rows:[]};
 const groupIds=[...new Set(inventory.ads.map(row=>row.adGroup.id))];
 const needsApi=result===null||groupIds.some(id=>!result.rows.some(row=>row.ad_group_id===id&&row.latest_date>=period.end));
 const api=shared?.performance??(needsApi?await readGoogleTestingApiData():null);
 return googleContentTestingCampaigns.map(campaignName=>{
  const ads=inventory.ads.filter(row=>row.campaign.name===campaignName);
  const groups=[...new Map(ads.map(row=>[row.adGroup.id,{id:row.adGroup.id,name:row.adGroup.name}])).values()];
  if(api){const report=apiGoogleSearchReport(api,campaignName,period,periodLabel,groups,undefined,allowed);report.campaignStatus=ads[0]?.campaign.status??"Unknown";report.adCount=ads.length;return report;}
  const rows=(result?.rows??[]).filter(row=>groups.some(group=>group.id===row.ad_group_id));
  return {campaignName,adCount:ads.length,campaignStatus:ads[0]?.campaign.status??"Unknown",period,periodLabel,testingStartDate:rows.map(row=>row.testing_start_date).sort()[0]??null,
   groups:groups.map(group=>{const row=rows.find(row=>row.ad_group_id===group.id);const spend=Number(row?.spend??0),revenue=Number(row?.revenue??0),orders=Number(row?.orders??0),impressions=Number(row?.impressions??0),clicks=Number(row?.clicks??0);return {label:"" as const,name:group.name,adGroupId:group.id,spend,revenue,orders,impressions,clicks,cpa:ratio(spend,orders),cvr:ratio(orders,clicks),roas:ratio(revenue,spend),ctr:ratio(clicks,impressions),cpc:ratio(spend,clicks)};}).sort((a,b)=>a.name.localeCompare(b.name))};
 });
}
