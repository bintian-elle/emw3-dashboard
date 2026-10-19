import {compareCampaignNamesNewestFirst} from "@/lib/campaign-name-order";
import "server-only";
import {googleCampaignReach} from "@/lib/google-campaign-reach";
import {getGoogleContentTests,type TestingPeriodInput} from "@/lib/testing-google";
import {getConcludedGooglePerformance} from "@/lib/concluded-google-performance";

/** One campaign scope, ordering and concluded-period filter for both page views. */
export async function getGoogleTestingPerformance(input:TestingPeriodInput={}) {
 const searches=await getGoogleContentTests(input);
 const selectedPeriod=searches.find(search=>search.period)?.period;
 const concluded=await getConcludedGooglePerformance(selectedPeriod,searches[0].periodLabel);
 const activeCards=[...searches].sort((a,b)=>compareCampaignNamesNewestFirst(a.campaignName,b.campaignName));
 // Campaign-wide unique_users includes non-testing ads and cannot represent this ad-label scope.
 await Promise.all(concluded.map(async item=>{const lifetime=item.definition.lifetime;if(item.report.period&&lifetime){const period={start:item.report.period.start>lifetime.start?item.report.period.start:lifetime.start,end:item.report.period.end<lifetime.end?item.report.period.end:lifetime.end};const reach=await googleCampaignReach(period);const names=[item.report.campaignName,`${item.report.campaignName} Brand_AbsTopPageTest_2026/07`];item.report.reach=names.every(name=>reach[name]!=null)?names.reduce((sum,name)=>sum+reach[name]!,0):null;}}));
 return {activeCards,concluded};
}
