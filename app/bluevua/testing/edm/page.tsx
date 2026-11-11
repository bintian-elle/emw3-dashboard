import {ChannelReportPeriodProvider,ChannelReportPeriodSync} from "../channel-report-period";
import {Suspense} from "react";
import {ChannelDataLoading} from "../channel-route-loading";
import {NovaChannelReport} from "../nova-subpage-header";
import { EdmCampaignSection } from "../edm-campaign-section";
import { TestingPageHeader } from "../testing-page-header";
import { getEdmTestingData } from "@/lib/testing-edm";
import { testingPeriodInput } from "@/lib/testing-google";

type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[]};
async function ChannelContent({searchParams}:{searchParams:Promise<SearchParams>}){const params=await searchParams,data=await getEdmTestingData(testingPeriodInput(params));return <><ChannelReportPeriodSync period={data.period}/><NovaChannelReport/><EdmCampaignSection data={data}/><footer className="py-8 text-center text-caption-2-regular text-text-tertiary">Source: Klaviyo Campaigns, Reporting and Metrics APIs</footer></>;}

export default function EdmTestingPage({searchParams}:{searchParams:Promise<SearchParams>}){
 return <ChannelReportPeriodProvider><TestingPageHeader headerOnly section="EDM" title="EDM Testing Performance"/><Suspense fallback={<ChannelDataLoading channel="EDM"/>}><ChannelContent searchParams={searchParams}/></Suspense></ChannelReportPeriodProvider>;
}
