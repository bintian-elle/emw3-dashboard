import { redditContentTests } from "@/lib/reddit-content-testing";
import { TestingPageHeader } from "../testing-page-header";
import { RedditCampaignSection } from "../reddit-campaign-section";
import { redditPeriodInput } from "@/lib/reddit-testing-period";
import { getRedditTestingData } from "@/lib/testing-reddit";

type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[]};
const queryString=(params:SearchParams)=>{const query=new URLSearchParams();for(const [key,value] of Object.entries(params)){const item=Array.isArray(value)?value[0]:value;if(item)query.set(key,item);}return query.toString();};
export default async function RedditTestingPage({searchParams}:{searchParams:Promise<SearchParams>}){const params=await searchParams;const data=await getRedditTestingData(redditPeriodInput(params),true);return <><TestingPageHeader section="Reddit" title="Reddit Testing Performance" description="Compare selected video, image and freeform content tests." redditDateFilter/>{redditContentTests.filter(test=>!data.campaigns.some(campaign=>campaign.name===test.name)).map(test=><p key={test.name} className="mb-4 text-body-regular text-text-secondary">Campaign not returned by Reddit Ads API: {test.name}</p>)}<RedditCampaignSection contentTesting data={data} query={queryString(params)}/><footer className="py-8 text-center text-caption-2-regular text-text-tertiary">Source: Reddit Ads API · Today’s data may be incomplete.</footer></>;}
