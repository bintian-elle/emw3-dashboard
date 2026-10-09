import {getConcludedGooglePerformance} from "@/lib/concluded-google-performance";
import {withTestingReturnTo} from "@/lib/testing-navigation";
import { Suspense } from "react";
import { TestingDataLoading } from "./testing-data-loading";
import { RiGoogleFill, RiMailLine, RiMetaFill, RiRedditFill } from "@remixicon/react";
import { DemandGenSection } from "./demand-gen-section";
import { GoogleTestSection } from "./google-test-section";
import { MetaCampaignSection } from "./meta-campaign-section";
import { RedditCampaignSection } from "./reddit-campaign-section";
import { EdmCampaignSection } from "./edm-campaign-section";
import { BusinessPerformance } from "./business-performance";
import { TestingPageHeader } from "./testing-page-header";
import { getDemandGenData } from "@/lib/testing-demand-gen";
import { getGoogleSearchTest, testingPeriodInput } from "@/lib/testing-google";
import { getMetaCampaignTest } from "@/lib/testing-meta";
import { getRedditTestingData } from "@/lib/testing-reddit";
import { getEdmTestingData } from "@/lib/testing-edm";
import { Chip } from "@/components/base/badges/chip";
import { cx } from "@/utils/cx";

type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[]};
const queryString=(params:SearchParams)=>{const query=new URLSearchParams();for(const [key,value] of Object.entries(params)){const item=Array.isArray(value)?value[0]:value;if(item)query.set(key,item);}return query.toString();};
const platforms=[{name:"Google",description:"Search and Demand Gen campaign testing",tone:"bg-background-primary-default text-chart-4",icon:RiGoogleFill},{name:"Meta",description:"Meta campaign testing",tone:"bg-background-primary-default text-chart-5",icon:RiMetaFill},{name:"Reddit",description:"Awareness and conversion campaign testing",tone:"bg-background-primary-default text-chart-3",icon:RiRedditFill},{name:"EDM",description:"Email campaign testing",tone:"bg-background-primary-default text-chart-8",icon:RiMailLine}];
function PlatformHeader({platform,activeTests,concludedTests=0}:{platform:(typeof platforms)[number];activeTests:number;concludedTests?:number}){const Icon=platform.icon;return <header className="flex items-center gap-4 px-2 py-1"><span className={cx("flex size-11 shrink-0 items-center justify-center rounded-xl",platform.tone)}><Icon className="size-6" aria-hidden/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-title-2-semibold text-text-primary">{platform.name}</h2><Chip variant="caption" color="soft">{activeTests} Active {activeTests===1?"Test":"Tests"}</Chip>{concludedTests>0&&<Chip variant="caption" color="purple">{concludedTests} Concluded {concludedTests===1?"Test":"Tests"}</Chip>}</div><p className="mt-1 text-body-regular text-text-secondary">{platform.description}</p></div></header>;}

async function TestingOverviewContent({searchParams}:{searchParams:Promise<SearchParams>}){
  const params=await searchParams,input=testingPeriodInput(params),query=queryString(params);
  const [google,demandGen,meta,reddit,edm]=await Promise.all([getGoogleSearchTest(input),getDemandGenData(input),getMetaCampaignTest(input),getRedditTestingData(input),getEdmTestingData(input)]);
  const concluded=await getConcludedGooglePerformance(google.period,google.periodLabel);
  const returnTo=`/bluevua/testing${query?`?${query}`:""}`;
  const activeTests={google:(google.campaignStatus==="ENABLED"?1:0)+demandGen.campaigns.filter(campaign=>campaign.campaignStatus==="ENABLED").length,meta:meta.campaigns.filter(campaign=>campaign.effectiveStatus==="ACTIVE").length,reddit:reddit.campaigns.filter(campaign=>(campaign.campaignStatus??"ACTIVE")==="ACTIVE").length,edm:edm.campaigns.length};
  return <><TestingPageHeader title="Testing Overview" description="Combined performance for the connected creative testing channels."/><BusinessPerformance google={google} concludedGoogle={concluded.map(item=>item.report)} demandGen={demandGen} meta={meta} reddit={reddit} edm={edm}/><section className="mt-10 rounded-3xl border border-border-button-default bg-background-secondary-default p-4" aria-label="Google performance"><PlatformHeader platform={platforms[0]} activeTests={activeTests.google} concludedTests={concluded.length}/><div className="mt-5"><GoogleTestSection test={google} compact/></div><DemandGenSection data={demandGen} query={query}/>{concluded.length>0&&<div className="mt-6 grid gap-6">{concluded.map(({definition,report,concludedOn})=><GoogleTestSection key={definition.id} compact test={report} description={definition.name} concludedOn={concludedOn} resourcesHref={definition.resourcesHref} creativeLinks={Object.fromEntries(report.groups.map(group=>[group.adGroupId,withTestingReturnTo(`/bluevua/testing/google/concluded/${definition.id}/${group.label==="Group A"?"treatment":"control"}`,returnTo)]))}/>)}</div>}</section><section className="mt-6 rounded-3xl border border-border-button-default bg-background-secondary-default p-4" aria-label="Meta performance"><PlatformHeader platform={platforms[1]} activeTests={activeTests.meta}/><div className="mt-5"><MetaCampaignSection data={meta} query={query}/></div></section><section className="mt-6 rounded-3xl border border-border-button-default bg-background-secondary-default p-4" aria-label="Reddit performance"><PlatformHeader platform={platforms[2]} activeTests={activeTests.reddit}/><RedditCampaignSection data={reddit} query={query}/></section><section className="mt-6 rounded-3xl border border-border-button-default bg-background-secondary-default p-4" aria-label="EDM performance"><PlatformHeader platform={platforms[3]} activeTests={activeTests.edm}/><EdmCampaignSection data={edm}/></section><footer className="py-8 text-center text-caption-2-regular text-text-tertiary">Connected channels: Google · Meta · Reddit · EDM · Source: Supabase, Meta Ads, Reddit Ads and Klaviyo</footer></>;
}

export default async function TestingOverviewPage({searchParams}:{searchParams:Promise<SearchParams>}) {
  const query=queryString(await searchParams);
  return <><Suspense key={query} fallback={<TestingDataLoading/>}><TestingOverviewContent searchParams={searchParams}/></Suspense></>;
}
