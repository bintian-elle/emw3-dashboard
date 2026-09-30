import { notFound } from "next/navigation";
import { TestingPageHeader } from "../../testing-page-header";
import { TestingBackNavigation } from "../../testing-back-navigation";
import { RedditContentPerformance } from "../../reddit-content-performance";
import { getRedditTestingData } from "@/lib/testing-reddit";

export default async function RedditGroupPage({params}:{params:Promise<{group:string}>}) {
  const {group:groupId}=await params;
  const data=await getRedditTestingData({},true);
  const campaign=data.campaigns.find(campaign=>campaign.groups.some(group=>group.adGroupId===groupId));
  const group=campaign?.groups.find(group=>group.adGroupId===groupId);
  if(!campaign||!group)notFound();
  return <><TestingPageHeader section="Reddit" title={group.name} description={campaign.name} reportingPeriod={`${data.period.start} – ${data.period.end} (today; partial data)`}/><TestingBackNavigation platform="Reddit" platformHref="/bluevua/testing/reddit" query=""/><RedditContentPerformance campaign={{...campaign,groups:[group]}}/></>;
}
