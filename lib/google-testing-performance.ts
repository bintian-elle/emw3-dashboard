import "server-only";
import {getGoogleContentTests,type TestingPeriodInput} from "@/lib/testing-google";
import {getConcludedGooglePerformance} from "@/lib/concluded-google-performance";

/** One campaign scope, ordering and concluded-period filter for both page views. */
export async function getGoogleTestingPerformance(input:TestingPeriodInput={}) {
 const searches=await getGoogleContentTests(input);
 const selectedPeriod=searches.find(search=>search.period)?.period;
 const concluded=await getConcludedGooglePerformance(selectedPeriod,searches[0].periodLabel);
 const activeCards=[...searches].sort((a,b)=>(b.testingStartDate??"").localeCompare(a.testingStartDate??"")||a.campaignName.localeCompare(b.campaignName));
 return {activeCards,concluded};
}
