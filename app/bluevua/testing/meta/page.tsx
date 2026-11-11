import {ChannelReportPeriodProvider,ChannelReportPeriodSync} from "../channel-report-period";
import {Suspense} from "react";
import {ChannelDataLoading} from "../channel-route-loading";
import {NovaChannelReport} from "../nova-subpage-header";
import { MetaCampaignSection } from "../meta-campaign-section";
import { TestingPageHeader } from "../testing-page-header";
import { testingPeriodInput } from "@/lib/testing-google";
import { getMetaCampaignTest } from "@/lib/testing-meta";

type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[]};
const queryString=(params:SearchParams)=>{const query=new URLSearchParams();for(const [key,value] of Object.entries(params)){const item=Array.isArray(value)?value[0]:value;if(item)query.set(key,item);}return query.toString();};

async function ChannelContent({searchParams}:{searchParams:Promise<SearchParams>}) {
  const params=await searchParams;
  const data=await getMetaCampaignTest(testingPeriodInput(params));
  return <><ChannelReportPeriodSync period={data.period}/><NovaChannelReport/><MetaCampaignSection data={data} query={queryString(params)} /><footer className="py-8 text-center text-caption-2-regular text-text-tertiary">Source: Meta Ads</footer></>;
}

export default function MetaTestingPage({searchParams}:{searchParams:Promise<SearchParams>}){
 return <ChannelReportPeriodProvider><TestingPageHeader headerOnly section="Meta" title="Meta Testing Performance"/><Suspense fallback={<ChannelDataLoading channel="Meta"/>}><ChannelContent searchParams={searchParams}/></Suspense></ChannelReportPeriodProvider>;
}
