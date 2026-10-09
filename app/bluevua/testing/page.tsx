import {getGoogleTestingPerformance} from "@/lib/google-testing-performance";
import { Suspense } from "react";
import { TestingDataLoading } from "./testing-data-loading";
import { RiGoogleFill, RiMailLine, RiMetaFill, RiRedditFill } from "@remixicon/react";
import { GooglePerformanceSections } from "./google-performance-sections";
import { MetaCampaignSection } from "./meta-campaign-section";
import { RedditCampaignSection } from "./reddit-campaign-section";
import { EdmCampaignSection } from "./edm-campaign-section";
import { BusinessPerformance } from "./business-performance";
import { TestingPageHeader } from "./testing-page-header";
import { testingPeriodInput } from "@/lib/testing-google";
import { getMetaCampaignTest } from "@/lib/testing-meta";
import { getRedditContentTestingData } from "@/lib/testing-reddit";
import { getEdmTestingData } from "@/lib/testing-edm";
import { Chip } from "@/components/base/badges/chip";
import { cx } from "@/utils/cx";

type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[]};
const queryString=(params:SearchParams)=>{const query=new URLSearchParams();for(const [key,value] of Object.entries(params)){const item=Array.isArray(value)?value[0]:value;if(item)query.set(key,item);}return query.toString();};
const platforms=[{name:"Google",description:"Nonbrand Search content testing",tone:"bg-background-primary-default text-chart-4",icon:RiGoogleFill},{name:"Meta",description:"Meta campaign testing",tone:"bg-background-primary-default text-chart-5",icon:RiMetaFill},{name:"Reddit",description:"Awareness and conversion campaign testing",tone:"bg-background-primary-default text-chart-3",icon:RiRedditFill},{name:"EDM",description:"Email campaign testing",tone:"bg-background-primary-default text-chart-8",icon:RiMailLine}];
function PlatformHeader({platform,activeTests,concludedTests=0}:{platform:(typeof platforms)[number];activeTests:number;concludedTests?:number}){const Icon=platform.icon;return <header className="flex items-center gap-4 px-2 py-1"><span className={cx("flex size-11 shrink-0 items-center justify-center rounded-xl",platform.tone)}><Icon className="size-6" aria-hidden/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-title-2-semibold text-text-primary">{platform.name}</h2><Chip variant="caption" color="soft">{activeTests} Active {activeTests===1?"Test":"Tests"}</Chip>{concludedTests>0&&<Chip variant="caption" color="purple">{concludedTests} Concluded {concludedTests===1?"Test":"Tests"}</Chip>}</div><p className="mt-1 text-body-regular text-text-secondary">{platform.description}</p></div></header>;}

async function TestingOverviewContent({searchParams}:{searchParams:Promise<SearchParams>}){
  const params=await searchParams,input=testingPeriodInput(params),query=queryString(params);
  const [google,meta,reddit,edm]=await Promise.all([getGoogleTestingPerformance(input),getMetaCampaignTest(input),getRedditContentTestingData(input),getEdmTestingData(input)]);
  const concluded=google.concluded;
  const returnTo=`/bluevua/testing${query?`?${query}`:""}`;
  const activeTests={google:google.activeCards.filter(campaign=>campaign.campaignStatus==="ENABLED").length,meta:meta.campaigns.filter(campaign=>campaign.effectiveStatus==="ACTIVE").length,reddit:reddit.campaigns.filter(campaign=>(campaign.campaignStatus??"ACTIVE")==="ACTIVE").length,edm:edm.campaigns.length};
  return <><TestingPageHeader title="Testing Overview" description="Combined performance for the connected creative testing channels."/><BusinessPerformance google={[...google.activeCards,...concluded.map(item=>item.report)]} meta={meta} reddit={reddit} edm={edm}/><section className="mt-10 rounded-3xl border border-border-button-default bg-background-secondary-default p-4" aria-label="Google performance"><PlatformHeader platform={platforms[0]} activeTests={activeTests.google} concludedTests={concluded.length}/><div className="mt-5"><GooglePerformanceSections data={google} returnTo={returnTo}/></div></section><section className="mt-6 rounded-3xl border border-border-button-default bg-background-secondary-default p-4" aria-label="Meta performance"><PlatformHeader platform={platforms[1]} activeTests={activeTests.meta}/><div className="mt-5"><MetaCampaignSection data={meta} query={query}/></div></section><section className="mt-6 rounded-3xl border border-border-button-default bg-background-secondary-default p-4" aria-label="Reddit performance"><PlatformHeader platform={platforms[2]} activeTests={activeTests.reddit}/><RedditCampaignSection contentTesting data={reddit} query={query}/></section><section className="mt-6 rounded-3xl border border-border-button-default bg-background-secondary-default p-4" aria-label="EDM performance"><PlatformHeader platform={platforms[3]} activeTests={activeTests.edm}/><EdmCampaignSection data={edm}/></section><footer className="py-8 text-center text-caption-2-regular text-text-tertiary">Connected channels: Google · Meta · Reddit · EDM · Source: Supabase, Meta Ads, Reddit Ads and Klaviyo</footer></>;
}

export default async function TestingOverviewPage({searchParams}:{searchParams:Promise<SearchParams>}) {
  const query=queryString(await searchParams);
  return <><Suspense key={query} fallback={<TestingDataLoading/>}><TestingOverviewContent searchParams={searchParams}/></Suspense></>;
}
