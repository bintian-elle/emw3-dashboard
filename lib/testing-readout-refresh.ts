import "server-only";
import {PMAX_TESTING_BASIS} from "@/lib/pmax-testing-performance";
import { refreshConcludedTestingReadouts } from "@/lib/testing-readout-concluded";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { readAiJob, readTestingReadoutCache } from "@/lib/ai-job-queue";
import { getGoogleContentTests, testingPeriodLabels } from "@/lib/testing-google";
import { resolveTestingPeriod, testingLatestCompleteDate } from "@/lib/testing-period";
import { getExpandedGoogleTesting, getExpandedGoogleTestingReadoutHistory } from "@/lib/google-expanded-content-testing";
import { getMetaCampaignTest, getMetaTestingReadoutHistory } from "@/lib/testing-meta";
import { getRedditContentTestingData } from "@/lib/testing-reddit";
import { getEdmTestingData } from "@/lib/testing-edm";
import { redditSinceStartLabel, redditSinceStartPreset } from "@/lib/reddit-testing-period";
import { getSocialPerformance } from "@/lib/testing-social";
import { testingReadoutKey } from "@/lib/testing-readout-contract";

import { googleContentTestingInventory } from "@/lib/google-content-testing-scope";
import { readGoogleTestingApiData, apiGoogleAdArchive } from "@/lib/google-testing-api";
import { testingCurrencyVerification } from "@/lib/testing-readout-currency";
import { deliveryWindow, readoutTotals, overviewReadoutReference, type ReadoutDailyRow } from "@/lib/testing-readout-input";
import { publishTestingReadoutJob, publishCompletedTestingReadouts } from "@/lib/testing-readout-publish";

const pool = new Pool({ connectionString: process.env.KLAVIYO_DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2, connectionTimeoutMillis: 12000 });
const dashboardId = "bluevua-content-testing";
const promptVersion = "content-testing-v5";
function day() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
// Keep creative text and performance while excluding HTML/media blobs from model input.
function compact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compact);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !["html", "resourceName"].includes(key)).map(([key, item]) => [key, compact(item)]));
  return value;
}
async function snapshot(preset: "lastWeek" | "wtd" | "mtd") {
  const period = { label: testingPeriodLabels[preset], ...resolveTestingPeriod(testingLatestCompleteDate(), { preset }) };
  const tests: Array<Record<string, unknown>> = [], gaps: string[] = [];
  const sources = [
    ["Google Search", () => getGoogleContentTests({ preset })],
    ["Google PMAX", () => getExpandedGoogleTesting("pmax", { preset })],
    ["Demand Gen", () => getExpandedGoogleTesting("demand-gen", { preset })],
    ["Meta", () => getMetaCampaignTest({ preset })],
    ["Reddit", () => getRedditContentTestingData({ preset })],
    ["EDM", () => getEdmTestingData({ preset })],
  ] as const;
  const results = await Promise.allSettled(sources.map(async ([channel, load]) => {
    const data = await load();
    const campaigns = Array.isArray(data) ? data : data.campaigns;
    return campaigns.map(campaign => {
      const row = campaign as unknown as Record<string, unknown>;
      const name = String(row.campaignName ?? row.name);
      return { test_id: name, channel, campaign_name: name, status: row.campaignStatus ?? row.status ?? "unknown", data: compact(row) };
    });
  }));
  results.forEach((result, index) => {
    if (result.status === "fulfilled") tests.push(...result.value);
    else gaps.push(`${sources[index][0]}: performance snapshot unavailable; do not infer zero delivery.`);
  });
  if (!tests.length) throw new Error(`No channel performance is available for ${period.label}.`);
  type MetricRow={spend:number;revenue:number;orders:number;impressions:number|null;clicks:number};
  const channels:Record<string,MetricRow[]>={"Google Search":[],"Google PMAX":[],"Demand Gen":[],Meta:[],Reddit:[]};
  const edm={revenue:0,orders:0,uniqueClicks:0 as number|null,delivered:0};
  const reachComponents:Record<string,number|null>={Google:null,Meta:null,Reddit:null,EDM:0};
  for(const test of tests){
    const row=test.data as Record<string,unknown>;
    if(test.channel==="Google Search")channels[test.channel].push(...row.groups as MetricRow[]);
    if(test.channel==="Google PMAX"||test.channel==="Demand Gen")channels[test.channel].push(...(row.groups as Array<{rows:Array<{metrics:MetricRow}>}>).flatMap(group=>group.rows.map(item=>item.metrics)));
    if(test.channel==="Meta"){channels.Meta.push(row.totals as MetricRow);reachComponents.Meta=(row.totals as {reach:number|null}).reach;}
    if(test.channel==="Reddit"){channels.Reddit.push(...(row.groups as Array<{activeAds:MetricRow[]}>).flatMap(group=>group.activeAds));reachComponents.Reddit=(reachComponents.Reddit??0)+Number(row.reach??0);}
    if(test.channel==="EDM")for(const item of row.tests as Array<{revenue:number;orders:number;clicks:number|null;delivered:number}>){edm.revenue+=item.revenue;edm.orders+=item.orders;edm.delivered+=item.delivered;edm.uniqueClicks=edm.uniqueClicks===null||item.clicks===null?null:edm.uniqueClicks+item.clicks;reachComponents.EDM=(reachComponents.EDM??0)+item.delivered;}
    if(test.channel==="Google Search"&&typeof row.reach==="number")reachComponents.Google=(reachComponents.Google??0)+row.reach;
  }
  return { period, comparison: null, tests, data_gaps: gaps, overview_display_totals:overviewReadoutReference({channels,reachComponents,edm}) };
}

export async function refreshTestingReadouts() {
  await publishCompletedTestingReadouts();
  const concluded = await refreshConcludedTestingReadouts().catch(error => ({ pending: false, status: "concluded_failed", error: error instanceof Error ? error.message : "Concluded analysis unavailable" }));
  const [source,prompt]=await Promise.all([readFile(path.join(process.cwd(),"prompts/insights/content-testing-source.md"),"utf8"),readFile(path.join(process.cwd(),"prompts/insights/content-testing.md"),"utf8")]);
  const revision=createHash("sha256").update(source).update(prompt).digest("hex").slice(0,12);
  const today = day(), id = `testing-readouts:${today}:${promptVersion}:${revision}`;
  // Serialize snapshot creation across local/production refresh callers without holding a transaction.
  const client = await pool.connect();
  let locked = false;
  try {
    const lock = await client.query<{ locked: boolean }>("select pg_try_advisory_lock(72929002) locked");
    locked = lock.rows[0].locked;
    if (!locked) return { pending: true, status: "preparing" };
    const exists = await client.query("select id from ai_job_queue where id=$1", [id]);
    if (!exists.rowCount) {
      const requirements=JSON.parse(await readFile(path.join(process.cwd(),"prompts/insights/content-testing-requirements.json"),"utf8")) as {channels:Array<{channel:string;requirements:Array<{id:string;requirement:string}>}>};
      const requirementIds=Object.fromEntries(requirements.channels.map(c=>[c.channel,c.requirements.map(r=>r.id)]));
      const cached=await readTestingReadoutCache(["framework:v1","period:social-lifetime"]);
      const fixed=cached.find(row=>row.cache_key==="framework:v1");
      const regenerateFramework=!fixed || fixed.prompt_version!==promptVersion;
      const periods=[];
      for(const preset of ["lastWeek","wtd","mtd"] as const)periods.push(await snapshot(preset));
      const redditLifetime=await getRedditContentTestingData({preset:redditSinceStartPreset});
      periods.push({period:{label:redditSinceStartLabel,...redditLifetime.period},comparison:null,tests:redditLifetime.campaigns.map(campaign=>({test_id:campaign.name,channel:"Reddit",campaign_name:campaign.name,status:campaign.campaignStatus??"unknown",data:compact(campaign)})),data_gaps:[]});
      const social=await getSocialPerformance();
      periods.push({period:{label:"Lifetime snapshot",start:today,end:today},comparison:null,tests:[{test_id:"social-selected-posts",channel:"Social Media",campaign_name:"Selected Instagram posts",status:"active",data:compact(social)}],data_gaps:["Social is a separate lifetime snapshot, not selected-period results.",...(social.stale?["Social snapshot is stale; retain its capturedAt timestamp."]:[])]});
      const [inventory,search,pmaxHistory,demandHistory,metaHistory,currencies]=await Promise.allSettled([googleContentTestingInventory(),readGoogleTestingApiData(),getExpandedGoogleTestingReadoutHistory("pmax"),getExpandedGoogleTestingReadoutHistory("demand-gen"),getMetaTestingReadoutHistory(),testingCurrencyVerification()]);
      const histories:Record<string,ReadoutDailyRow[]>={};
      if(search.status==="fulfilled")for(const row of search.value.rows){const name=row.campaign.name;histories[name]??=[];histories[name].push({...apiGoogleAdArchive({version:2,capturedAt:0,start:row.segments.date,end:row.segments.date,rows:[row]}).days[0]});}
      for(const result of [pmaxHistory,demandHistory])if(result.status==="fulfilled")for(const period of periods)for(const test of period.tests){const row=test as Record<string,unknown>;const data=row.data as {id?:string;groups?:Array<{rows:Array<{id:string}>}>};if(!data?.id||histories[String(row.test_id)])continue;const ids=new Set(data.groups?.flatMap(g=>g.rows.map(r=>r.id)));const days=result.value.rows.filter(r=>r.campaignId===data.id&&ids.has(r.entityId!));if(days.length)histories[String(row.test_id)]=days;}
      const creativeCatalog:Record<string,unknown>={search:inventory.status==="fulfilled"?compact(inventory.value):{unavailable:true},daily_history:histories,meta_daily_history:metaHistory.status==="fulfilled"?metaHistory.value:{unavailable:true},social:compact(social)};
      for(const period of periods)for(const rawTest of period.tests){
        const test=rawTest as Record<string,unknown>,data=test.data as Record<string,unknown>;
        let history=histories[String(test.test_id)];
        if(test.channel==="Meta"&&metaHistory.status==="fulfilled"){const ids=new Set((data.adGroups as Array<{activeAds:Array<{adId:string}>}>).flatMap(g=>g.activeAds.map(a=>a.adId)));history=metaHistory.value.filter(r=>ids.has(r.adId!));}
        test.delivery_window=history?deliveryWindow(history,period.period):{first_observed_delivery:null,active_days_in_period:null,launch_basis:test.channel==="EDM"?`Actual send date: ${data.sendDate}`:"Verified first-delivery date unavailable; do not infer from campaign name or compare raw volumes as equal-duration tests."};
        test.scope_policy=test.channel==="Reddit"?"Configured testing ads in configured ad groups only. Campaign totals are background; they do not expand Overview or creative financial scope.":test.channel==="Meta"?"The selected Meta campaign is testing; use its displayed snapshot, with creative attribution supported by ad rows.":"Selected configured testing entities only.";
        if(test.channel==="Meta"&&metaHistory.status==="fulfilled"){
          const all=metaHistory.value;
          const details=(data.adGroups as Array<{activeAds:Array<{adId:string}>}>).flatMap(g=>g.activeAds);
          const ids=[...new Set([...all.map(r=>r.adId).filter((id):id is string=>Boolean(id)),...details.map(r=>r.adId)])];
          test.ad_performance=ids.map(adId=>{const days=all.filter(r=>r.adId===adId),selected=days.filter(r=>r.date>=period.period.start&&r.date<=period.period.end);const metadata=details.find(r=>r.adId===adId);const totals=readoutTotals(selected),linkClicks=selected.reduce((sum,r)=>sum+(r.linkClicks??0),0);return{...totals,adId,name:days[0]?.name,...metadata,performance_basis:metadata?"Same selected-period ad-insights snapshot as page; daily history is for trend/delivery only.":"Historical ad absent from current inventory; daily-history totals, potentially captured at a different time than campaign totals.",...(metadata?{}:{linkClicks,linkCtr:(totals.impressions??0)>0?linkClicks/(totals.impressions??1):null}),reach:metadata?(metadata as {reach?:number}).reach??null:null,delivery_window:deliveryWindow(days,period.period)};});
          test.delivery_window=deliveryWindow(all,period.period);
        }
        if(test.channel==="Reddit")test.ad_performance=(data.groups as Array<{name:string;activeAds:unknown[]}>).flatMap(g=>g.activeAds.map(ad=>({...ad as object,adGroupName:g.name})));
        if(!creativeCatalog[String(test.test_id)])creativeCatalog[String(test.test_id)]=compact(data);
      }
      const body = {
        mode: "testing_readout", dashboard_id: dashboardId, language: "en", period: { start: periods[0].period.start, end: periods[0].period.end }, comparison: null,
        preset_label: "Daily content testing batch", comparison_label: "Documented variants only",
        conversation: { project: "bluevua", kind: "insights" },
        insight_prompt: `${source}\n\n---\n${prompt}\n\nRUN_MODE=period_readout_batch. REGENERATE_FRAMEWORK=${regenerateFramework}. The exact coverage checklist and data are in analysis_payload. Return all supplied periods in the native schema.`,
        analysis_payload: { metric_basis:{pmax:PMAX_TESTING_BASIS}, generation_instructions:`${source}\n\n${prompt}`, currency_verification:currencies.status==="fulfilled"?currencies.value:{unavailable:true}, run_mode:"period_readout_batch", prompt_version:promptVersion, source_document:requirements, requirement_ids:requirementIds, regenerate_framework:regenerateFramework, static_framework:regenerateFramework?null:fixed?.payload, generated_for:today, captured_at:new Date().toISOString(), periods, creative_catalog:creativeCatalog, approved_scope:{testing_entities_only:true,reddit_overview_uses_configured_ads:true,social_in_overview_numeric_totals:false}, metric_contract:{overview_reach:"Sum available Google campaign reach, Meta campaign reach, Reddit campaign reach and EDM Delivered, without cross-platform deduplication. Report missing components but do not withhold the available-component total because of overlap. Never sum daily/ad reach into unique people.",rate_inputs:"decimal fractions",rate_output:"percent units",currency:"Use verified account currencies. When all are USD, compute descriptive paid ROAS=sum reported paid conversion value/sum spend; attribution overlap limits interpretation, not this arithmetic",google:"testing entities only; PMax group metrics are reconciled testing asset totals. Never sum assetPerformance into group or Overview totals. Null impressions/CTR are unavailable; do not fill from product-level or asset-level impression sums.",meta_reddit:"Use displayed testing scope; Reddit financials only configured testing ads/groups, whole-campaign totals background. Angle attribution requires ad detail.",edm:"event-time metrics for the confirmed September 18 test; module numerator/denominator distinct from whole email"} },
      };
      // The deployed worker forwards the dedicated Bridge body. This controller
      // publishes testing results, so bypass the older worker's EDM finalization.
      await client.query("insert into ai_job_queue(id,request_id,body,priority,finalized) values($1,$2,$3::jsonb,-10,true) on conflict(id) do nothing", [id, randomUUID(), JSON.stringify(body)]);
    }
  } finally {
    if (locked) await client.query("select pg_advisory_unlock(72929002)");
    client.release();
  }
  const job = await readAiJob(id);
  if (job.status === "failed") throw new Error(`Testing analysis failed (${id}); inspect the existing task before retrying.`);
  if (job.status !== "completed") return { pending: true, status: job.status, jobId: id };
  await publishTestingReadoutJob(job);
  const supplied = (job.body.analysis_payload as { periods: Array<{ period: Parameters<typeof testingReadoutKey>[0] }> }).periods;
  return { pending: concluded.pending, status: concluded.status, concluded, jobId: id, saved: supplied.map(item => testingReadoutKey(item.period)) };
}
