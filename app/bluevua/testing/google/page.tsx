import {ChannelReportPeriodProvider,ChannelReportPeriodSync} from "../channel-report-period";
import {Suspense} from "react";
import {ChannelDataLoading} from "../channel-route-loading";
import {NovaChannelReport} from "../nova-subpage-header";
import {GooglePerformanceSections} from "../google-performance-sections";
import {getGoogleTestingPerformance} from "@/lib/google-testing-performance";
import {TestingPageHeader} from "../testing-page-header";
import {testingPeriodInput} from "@/lib/testing-google";

type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[]};


async function ChannelContent({searchParams}:{searchParams:Promise<SearchParams>}) {
  const params=await searchParams;
  const returnQuery=new URLSearchParams();for(const [key,raw] of Object.entries(params)){const value=Array.isArray(raw)?raw[0]:raw;if(value&&["period","start","end","compare","compareStart","compareEnd"].includes(key))returnQuery.set(key,value);}
  const returnTo=`/bluevua/testing/google/search${returnQuery.size?`?${returnQuery}`:""}`;
  const input=testingPeriodInput(params);
  const data=await getGoogleTestingPerformance(input);
  return <><ChannelReportPeriodSync period={data.period}/><NovaChannelReport/><GooglePerformanceSections data={data} returnTo={returnTo}/><footer className="py-8 text-center text-caption-2-regular text-text-tertiary">Source: Google Ads via Supabase</footer></>;
}

export default function GoogleTestingPage({searchParams}:{searchParams:Promise<SearchParams>}){
 return <ChannelReportPeriodProvider><TestingPageHeader headerOnly section="Google Search" title="Google Search Testing Performance"/><Suspense fallback={<ChannelDataLoading channel="Google Search"/>}><ChannelContent searchParams={searchParams}/></Suspense></ChannelReportPeriodProvider>;
}
