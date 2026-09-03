import { EdmCampaignSection } from "../edm-campaign-section";
import { TestingPageHeader } from "../testing-page-header";
import { getEdmTestingData } from "@/lib/testing-edm";
import { testingPeriodInput } from "@/lib/testing-google";

type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[]};
export default async function EdmTestingPage({searchParams}:{searchParams:Promise<SearchParams>}){const params=await searchParams,data=await getEdmTestingData(testingPeriodInput(params));return <><TestingPageHeader section="EDM" title="EDM Testing Performance" description="Klaviyo email campaign A/B test performance."/><EdmCampaignSection data={data}/><footer className="py-8 text-center text-caption-2-regular text-text-tertiary">Source: Klaviyo Campaigns, Reporting and Metrics APIs</footer></>;}
