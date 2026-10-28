import {getExpandedGoogleTesting,expandedGoogleReports} from "@/lib/google-expanded-content-testing";
import {getGoogleTestingPerformance} from "@/lib/google-testing-performance";
import { Suspense } from "react";
import { TestingDataLoading } from "./testing-data-loading";
import { TestReadout } from "./test-readout";
import { BusinessPerformance } from "./business-performance";
import { ChannelPerformance } from "./channel-performance";
import {getOverviewDailyData} from "@/lib/overview-daily-data";
import {overviewHeadlineMetrics} from "@/lib/overview-headline-metrics";
import { TestingPageHeader } from "./testing-page-header";
import { testingPeriodInput } from "@/lib/testing-google";
import { getMetaCampaignTest } from "@/lib/testing-meta";
import { getRedditContentTestingData } from "@/lib/testing-reddit";
import { getEdmTestingData } from "@/lib/testing-edm";

type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[]};
const queryString=(params:SearchParams)=>{const query=new URLSearchParams();for(const [key,value] of Object.entries(params)){const item=Array.isArray(value)?value[0]:value;if(item)query.set(key,item);}return query.toString();};
async function TestingOverviewContent({searchParams}:{searchParams:Promise<SearchParams>}){
  const params=await searchParams,input=testingPeriodInput(params),query=queryString(params);
  const [google,meta,reddit,edm,pmax,demandGen]=await Promise.all([getGoogleTestingPerformance(input),getMetaCampaignTest(input),getRedditContentTestingData(input),getEdmTestingData(input),getExpandedGoogleTesting("pmax",input),getExpandedGoogleTesting("demand-gen",input)]);
  const concluded=google.concluded;
  const overviewData={google:[...google.activeCards,...concluded.map(item=>item.report),...expandedGoogleReports(pmax),...expandedGoogleReports(demandGen)],meta,reddit,edm};
  const headlineMetrics=overviewHeadlineMetrics(overviewData);
  const trends=getOverviewDailyData(overviewData);
  return <><TestingPageHeader title="Testing Overview" overviewMetrics={headlineMetrics}/><TestReadout standalone channel="overview" testIdentity="overview" period={{label:meta.periodLabel,...meta.period}} overviewMetrics={headlineMetrics}/><BusinessPerformance {...overviewData} headlineMetrics={headlineMetrics} trends={trends}/><ChannelPerformance google={google} meta={meta} reddit={reddit} edm={edm} pmax={pmax} demandGen={demandGen} query={query}/></>;
}

export default async function TestingOverviewPage({searchParams}:{searchParams:Promise<SearchParams>}) {
  const query=queryString(await searchParams);
  return <><Suspense key={query} fallback={<TestingDataLoading/>}><TestingOverviewContent searchParams={searchParams}/></Suspense></>;
}
