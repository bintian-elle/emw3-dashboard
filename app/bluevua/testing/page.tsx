import {getExpandedGoogleTesting,expandedGoogleReports} from "@/lib/google-expanded-content-testing";
import {getGoogleTestingPerformance} from "@/lib/google-testing-performance";
import {Suspense} from "react";
import {getOverviewDailyData} from "@/lib/overview-daily-data";
import {overviewHeadlineMetrics} from "@/lib/overview-headline-metrics";
import { testingPeriodInput } from "@/lib/testing-google";
import { getMetaCampaignTest } from "@/lib/testing-meta";
import { getRedditContentTestingData } from "@/lib/testing-reddit";
import { getEdmTestingData } from "@/lib/testing-edm";
import {NovaPreviewHeader} from "./nova-preview-shell";
import {NovaPreviewBusinessPerformance} from "./nova-preview-metrics";
import {NovaChannelPerformance} from "./nova-preview-channels";
import {NovaOverviewSummary} from "./nova-preview-summary";
import {configuredTestingCampaignCount} from "@/lib/testing-campaign-counts";
import {TestingWorkspaceTabs} from "./testing-workspace-tabs";
import {resolveTestingPeriod,testingLatestCompleteDate} from "@/lib/testing-period";
import {OverviewLoadingContent} from "./overview-loading";
import {readRememberedSnapshotVersions} from "@/lib/testing-data-cache";
import {testingSnapshotScopes,testingSnapshotWatchKey} from "@/lib/testing-snapshot-watch";
import {TestingSnapshotBaseline} from "./testing-snapshot-baseline";

type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[];designPreview?:string|string[]};
const queryString=(params:SearchParams)=>{const query=new URLSearchParams();for(const [key,value] of Object.entries(params)){const item=Array.isArray(value)?value[0]:value;if(item)query.set(key,item);}return query.toString();};
async function TestingOverviewContent({searchParams}:{searchParams:Promise<SearchParams>}){
  const params=await searchParams,input=testingPeriodInput(params),query=queryString(params);
  const baseline=readRememberedSnapshotVersions(testingSnapshotScopes('overview',input));
  const baselineKey=testingSnapshotWatchKey('overview',Array.isArray(params.period)?params.period[0]:params.period,Array.isArray(params.start)?params.start[0]:params.start,Array.isArray(params.end)?params.end[0]:params.end);
  const [google,meta,reddit,edm,pmax,demandGen]=await Promise.all([getGoogleTestingPerformance(input),getMetaCampaignTest(input),getRedditContentTestingData(input),getEdmTestingData(input),getExpandedGoogleTesting("pmax",input),getExpandedGoogleTesting("demand-gen",input)]);
  const concluded=google.concluded;
  const overviewData={google:[...google.activeCards,...concluded.map(item=>item.report),...expandedGoogleReports(pmax),...expandedGoogleReports(demandGen)],meta,reddit,edm};
  const headlineMetrics=overviewHeadlineMetrics(overviewData);
  const trends=getOverviewDailyData(overviewData);
  return <><TestingSnapshotBaseline cacheKey={baselineKey} versions={baseline}/><NovaOverviewSummary period={{label:meta.periodLabel,...meta.period}} overviewMetrics={headlineMetrics}/><NovaPreviewBusinessPerformance {...overviewData} headlineMetrics={headlineMetrics} trends={trends}/><NovaChannelPerformance google={google} meta={meta} reddit={reddit} edm={edm} pmax={pmax} demandGen={demandGen} query={query}/></>;
}

export default async function TestingOverviewPage({searchParams}:{searchParams:Promise<SearchParams>}) {
  const params=await searchParams;
  const period=resolveTestingPeriod(testingLatestCompleteDate(),testingPeriodInput(params));
  return <><NovaPreviewHeader sharePeriod={period}/><TestingWorkspaceTabs active="overview" count={configuredTestingCampaignCount()}/><Suspense key={queryString(params)} fallback={<OverviewLoadingContent/>}><TestingOverviewContent searchParams={searchParams}/></Suspense></>;
}
