import {GooglePerformanceSections} from "../google-performance-sections";
import {getGoogleTestingPerformance} from "@/lib/google-testing-performance";
import {TestingPageHeader} from "../testing-page-header";
import {testingPeriodInput} from "@/lib/testing-google";

type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[]};


export default async function GoogleTestingPage({searchParams}:{searchParams:Promise<SearchParams>}) {
  const params=await searchParams;
  const returnQuery=new URLSearchParams();for(const [key,raw] of Object.entries(params)){const value=Array.isArray(raw)?raw[0]:raw;if(value&&["period","start","end"].includes(key))returnQuery.set(key,value);}
  const returnTo=`/bluevua/testing/google${returnQuery.size?`?${returnQuery}`:""}`;
  const input=testingPeriodInput(params);
  const data=await getGoogleTestingPerformance(input);
  return <><TestingPageHeader section="Google" title="Google Testing Performance" description="Nonbrand Search content testing across all ad groups." /><GooglePerformanceSections data={data} returnTo={returnTo}/><footer className="py-8 text-center text-caption-2-regular text-text-tertiary">Source: Google Ads via Supabase</footer></>;
}
