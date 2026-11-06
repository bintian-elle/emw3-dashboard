import "server-only";
import {readInsightAssets} from "@/lib/testing-insight-assets.server";
import {PMAX_TESTING_BASIS} from "@/lib/pmax-testing-performance";
import { getGoogleContentTests, testingPeriodLabels, type TestingPeriodInput } from "@/lib/testing-google";
import { resolveTestingPeriod, testingLatestCompleteDate } from "@/lib/testing-period";
import { getExpandedGoogleTesting, getExpandedGoogleTestingReadoutHistory } from "@/lib/google-expanded-content-testing";
import { getMetaCampaignTest, getMetaTestingReadoutHistory } from "@/lib/testing-meta";
import { getRedditContentTestingData } from "@/lib/testing-reddit";
import { getEdmTestingData } from "@/lib/testing-edm";
import { redditSinceStartLabel, redditSinceStartPreset } from "@/lib/reddit-testing-period";
import { getSocialPerformance } from "@/lib/testing-social";
import {manualTestingChannels,type ManualTestingScope} from "@/lib/testing-manual-scope";

import { googleContentTestingInventory } from "@/lib/google-content-testing-scope";
import { readGoogleTestingApiData, apiGoogleAdArchive } from "@/lib/google-testing-api";
import { testingCurrencyVerification } from "@/lib/testing-readout-currency";
import { deliveryWindow, readoutTotals, overviewReadoutReference, type ReadoutDailyRow } from "@/lib/testing-readout-input";

function day() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
// Keep creative text and performance while excluding HTML/media blobs from model input.
function compact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compact);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !["html", "resourceName"].includes(key)).map(([key, item]) => [key, compact(item)]));
  return value;
}
async function snapshot(input: TestingPeriodInput & {manualScope?:ManualTestingScope}) {
  const preset=input.preset??"lastWeek";
  const period = { label: testingPeriodLabels[preset], ...resolveTestingPeriod(testingLatestCompleteDate(), input), ...(input.manualScope?{manualScope:input.manualScope}:{}) };
  const tests: Array<Record<string, unknown>> = [], gaps: string[] = [];
  const sources = [
    ["Google Search", () => getGoogleContentTests(input)],
    ["Google PMAX", () => getExpandedGoogleTesting("pmax", input)],
    ["Demand Gen", () => getExpandedGoogleTesting("demand-gen", input)],
    ["Meta", () => getMetaCampaignTest(input)],
    ["Reddit", () => getRedditContentTestingData(input)],
    ["EDM", () => getEdmTestingData(input)],
  ] as const;
  const selectedSources=input.manualScope&&input.manualScope!=="overview"?sources.filter(([channel])=>channel===manualTestingChannels[input.manualScope as Exclude<ManualTestingScope,"overview">]):sources;
  const results = await Promise.allSettled(selectedSources.map(async ([channel, load]) => {
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
    else gaps.push(`${selectedSources[index][0]}: performance snapshot unavailable; do not infer zero delivery.`);
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

/** The legacy readout pipeline is retired. Manual reports use the visual generation service. */
export async function refreshTestingReadouts():Promise<{pending:boolean;status:string}> {
  throw new Error('Legacy readout generation has been retired.');
}

export async function captureTestingChannelInputs(presets: Array<"lastWeek"|"wtd"|"mtd">){
 const today=day();
      const periods=[];
      for(const preset of presets)periods.push(await snapshot({preset}));
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

 return {captured_at:new Date().toISOString(),metric_basis:{pmax:PMAX_TESTING_BASIS},periods,creative_catalog:{...creativeCatalog,reference_index:await readInsightAssets()},currency_verification:currencies.status==="fulfilled"?currencies.value:{unavailable:true}};
}
