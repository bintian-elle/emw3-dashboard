import { DemandGenSection } from "../demand-gen-section";
import { GoogleTestSection } from "../google-test-section";
import { TestingPageHeader } from "../testing-page-header";
import { getDemandGenData } from "@/lib/testing-demand-gen";
import { getGoogleSearchTest, testingPeriodInput } from "@/lib/testing-google";

type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[]};
const queryString=(params:SearchParams)=>{const query=new URLSearchParams();for(const [key,value] of Object.entries(params)){const item=Array.isArray(value)?value[0]:value;if(item)query.set(key,item);}return query.toString();};

export default async function GoogleTestingPage({searchParams}:{searchParams:Promise<SearchParams>}) {
  const params=await searchParams;const input=testingPeriodInput(params);
  const [search,demandGen]=await Promise.all([getGoogleSearchTest(input),getDemandGenData(input)]);
  return <><TestingPageHeader section="Google" title="Google Testing Performance" description="Search and Demand Gen tests using the metrics defined in the Q4 testing plan." /><GoogleTestSection test={search} /><DemandGenSection data={demandGen} query={queryString(params)} /><footer className="py-8 text-center text-caption-2-regular text-text-tertiary">Source: Google Ads via Supabase</footer></>;
}
