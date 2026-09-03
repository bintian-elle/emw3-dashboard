import { TestingPageHeader } from "../testing-page-header";
import { RedditCampaignSection } from "../reddit-campaign-section";
import { testingPeriodInput } from "@/lib/testing-google";
import { getRedditTestingData } from "@/lib/testing-reddit";

type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[]};
const queryString=(params:SearchParams)=>{const query=new URLSearchParams();for(const [key,value] of Object.entries(params)){const item=Array.isArray(value)?value[0]:value;if(item)query.set(key,item);}return query.toString();};
export default async function RedditTestingPage({searchParams}:{searchParams:Promise<SearchParams>}){const params=await searchParams;const data=await getRedditTestingData(testingPeriodInput(params));return <><TestingPageHeader section="Reddit" title="Reddit Testing Performance" description="Awareness and conversion campaign performance."/><RedditCampaignSection data={data} query={queryString(params)}/><footer className="py-8 text-center text-caption-2-regular text-text-tertiary">Source: Reddit Ads API</footer></>;}
