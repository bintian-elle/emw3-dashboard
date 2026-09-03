import { MetaCampaignSection } from "../meta-campaign-section";
import { TestingPageHeader } from "../testing-page-header";
import { testingPeriodInput } from "@/lib/testing-google";
import { getMetaCampaignTest } from "@/lib/testing-meta";

type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[]};
const queryString=(params:SearchParams)=>{const query=new URLSearchParams();for(const [key,value] of Object.entries(params)){const item=Array.isArray(value)?value[0]:value;if(item)query.set(key,item);}return query.toString();};

export default async function MetaTestingPage({searchParams}:{searchParams:Promise<SearchParams>}) {
  const params=await searchParams;
  const data=await getMetaCampaignTest(testingPeriodInput(params));
  return <><TestingPageHeader section="Meta" title="Meta Testing Performance" description="Campaign strategy and ad group audience performance using the metrics defined in the Q4 testing plan." /><MetaCampaignSection data={data} query={queryString(params)} /><footer className="py-8 text-center text-caption-2-regular text-text-tertiary">Source: Meta Ads</footer></>;
}
