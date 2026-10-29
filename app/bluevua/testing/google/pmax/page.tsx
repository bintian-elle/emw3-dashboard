import {TestingPageHeader} from "../../testing-page-header";
import {GoogleExpandedContentSection} from "../../google-expanded-content-section";
import {getExpandedGoogleTesting} from "@/lib/google-expanded-content-testing";
import {testingPeriodInput} from "@/lib/testing-google";
type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[]};
export default async function ContentTestingPage({searchParams}:{searchParams:Promise<SearchParams>}){
 const params=await searchParams;
 const data=await getExpandedGoogleTesting("pmax",testingPeriodInput(params));
 const query=new URLSearchParams();for(const [key,raw]of Object.entries(params)){const value=Array.isArray(raw)?raw[0]:raw;if(value&&["period","start","end"].includes(key))query.set(key,value);}
 const returnTo=`/bluevua/testing/google/pmax${query.size?`?${query}`:""}`;
 return <><TestingPageHeader section="Google PMAX" title="Google PMAX Testing Performance" sharePeriod={data.period} description="Content testing creative performance."/><GoogleExpandedContentSection data={data} returnTo={returnTo}/></>;
}
