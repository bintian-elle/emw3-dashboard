import {withTestingReturnTo} from "@/lib/testing-navigation";
import {getConcludedGooglePerformance} from "@/lib/concluded-google-performance";
import { GoogleTestSection } from "../google-test-section";
import { TestingPageHeader } from "../testing-page-header";
import { getGoogleContentTests, testingPeriodInput } from "@/lib/testing-google";

type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[]};


export default async function GoogleTestingPage({searchParams}:{searchParams:Promise<SearchParams>}) {
  const params=await searchParams;
  const returnQuery=new URLSearchParams();for(const [key,raw] of Object.entries(params)){const value=Array.isArray(raw)?raw[0]:raw;if(value&&["period","start","end"].includes(key))returnQuery.set(key,value);}
  const returnTo=`/bluevua/testing/google${returnQuery.size?`?${returnQuery}`:""}`;
  const input=testingPeriodInput(params);
  const searches=await getGoogleContentTests(input);
  const selectedPeriod=searches.find(search=>search.period)?.period;
  const concluded=await getConcludedGooglePerformance(selectedPeriod,searches[0].periodLabel);
  const activeCards=[...searches].sort((a,b)=>(b.testingStartDate??"").localeCompare(a.testingStartDate??"")||a.campaignName.localeCompare(b.campaignName));
  return <><TestingPageHeader section="Google" title="Google Testing Performance" description="Nonbrand Search content testing across all ad groups." /><div className="grid gap-6">{activeCards.map(test=><GoogleTestSection key={test.campaignName} test={test} creativeLinks={Object.fromEntries(test.groups.map(group=>[group.adGroupId,withTestingReturnTo(`/bluevua/testing/google/search/${group.adGroupId}`,returnTo)]))} compact description="Content testing · All ad groups"/>)}{concluded.map(({definition,report,concludedOn})=><GoogleTestSection key={definition.id} compact test={report} creativeLinks={Object.fromEntries(report.groups.map(group=>[group.adGroupId,withTestingReturnTo(`/bluevua/testing/google/concluded/${definition.id}/${group.label==="Group A"?"treatment":"control"}`,returnTo)]))} description={definition.name} concludedOn={concludedOn} resourcesHref={definition.resourcesHref}/>)}</div><footer className="py-8 text-center text-caption-2-regular text-text-tertiary">Source: Google Ads via Supabase</footer></>;
}
