import {safeTestingReturnTo,testingCampaignHref} from "@/lib/testing-navigation";
import { redditPeriodInput, type RedditSearchParams } from "@/lib/reddit-testing-period";
import { notFound } from "next/navigation";
import { TestingPageHeader } from "../../testing-page-header";
import { RedditContentPerformance } from "../../reddit-content-performance";
import { getRedditContentTestingData } from "@/lib/testing-reddit";
import {TestReadout} from "../../test-readout";
import styles from "../../channel-content.module.css";

export default async function RedditGroupPage({params,searchParams}:{params:Promise<{group:string}>;searchParams:Promise<RedditSearchParams & {returnTo?:string|string[]}>}) {
  const {group:groupId}=await params;
  const query=await searchParams;
  const data=await getRedditContentTestingData(redditPeriodInput(query));
  const rawReturn=Array.isArray(query.returnTo)?query.returnTo[0]:query.returnTo;
  const returnTo=safeTestingReturnTo(rawReturn,"/bluevua/testing/reddit");
  const campaign=data.campaigns.find(campaign=>campaign.groups.some(group=>group.adGroupId===groupId));
  const group=campaign?.groups.find(group=>group.adGroupId===groupId);
  if(!campaign||!group)notFound();
  const backHref=testingCampaignHref(returnTo,"reddit",campaign.name,query);
  return <><TestingPageHeader section="Reddit" title={group.name} description={campaign.name} redditDateFilter backHref={backHref} sharePeriod={data.period}/><p className={styles.muted}>{data.periodLabel} · {data.period.start} – {data.period.end}</p><TestReadout standalone channel={campaign.kind==="Awareness"?"reddit-awareness":"reddit-conversion"} testIdentity={campaign.name} period={{label:data.periodLabel,...data.period}}><RedditContentPerformance campaign={{...campaign,groups:[group]}}/></TestReadout></>;
}
