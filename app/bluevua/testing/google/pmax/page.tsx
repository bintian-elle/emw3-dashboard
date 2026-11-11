import {ChannelReportPeriodProvider,ChannelReportPeriodSync} from "../../channel-report-period";
import {Suspense} from "react";
import {ChannelDataLoading} from "../../channel-route-loading";
import {NovaChannelReport} from "../../nova-subpage-header";
import {readPmaxReadableReport} from "@/lib/testing-insight-presentation.server";
import {PmaxPresentationProvider} from "../../insight-presentation";
import {TestingPageHeader} from "../../testing-page-header";
import {GoogleExpandedContentSection} from "../../google-expanded-content-section";
import {getExpandedGoogleTesting} from "@/lib/google-expanded-content-testing";
import {testingPeriodInput} from "@/lib/testing-google";
type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[]};
async function ChannelContent({searchParams}:{searchParams:Promise<SearchParams>}){
 const params=await searchParams;
 const data=await getExpandedGoogleTesting("pmax",testingPeriodInput(params));
 const query=new URLSearchParams();for(const [key,raw]of Object.entries(params)){const value=Array.isArray(raw)?raw[0]:raw;if(value&&["period","start","end","compare","compareStart","compareEnd"].includes(key))query.set(key,value);}
 const returnTo=`/bluevua/testing/google/pmax${query.size?`?${query}`:""}`;
 const readable=await readPmaxReadableReport(data.period);
 return <PmaxPresentationProvider report={readable}><ChannelReportPeriodSync period={data.period}/><NovaChannelReport/><GoogleExpandedContentSection data={data} returnTo={returnTo}/></PmaxPresentationProvider>;
}

export default function ContentTestingPage({searchParams}:{searchParams:Promise<SearchParams>}){
 return <ChannelReportPeriodProvider><TestingPageHeader headerOnly section="Google PMAX" title="Google PMAX Testing Performance"/><Suspense fallback={<ChannelDataLoading channel="Google PMAX"/>}><ChannelContent searchParams={searchParams}/></Suspense></ChannelReportPeriodProvider>;
}
