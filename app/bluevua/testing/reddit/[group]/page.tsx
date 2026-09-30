import { redditPeriodInput, type RedditSearchParams } from "@/lib/reddit-testing-period";
import { notFound } from "next/navigation";
import { TestingPageHeader } from "../../testing-page-header";
import { TestingBackNavigation } from "../../testing-back-navigation";
import { RedditContentPerformance } from "../../reddit-content-performance";
import { getRedditTestingData } from "@/lib/testing-reddit";

export default async function RedditGroupPage({params,searchParams}:{params:Promise<{group:string}>;searchParams:Promise<RedditSearchParams>}) {
  const {group:groupId}=await params;
  const query=await searchParams;
  const data=await getRedditTestingData(redditPeriodInput(query),true);
  const backQuery=new URLSearchParams();
  for(const [key,raw] of Object.entries(query)){const value=Array.isArray(raw)?raw[0]:raw;if(value)backQuery.set(key,value);}
  const campaign=data.campaigns.find(campaign=>campaign.groups.some(group=>group.adGroupId===groupId));
  const group=campaign?.groups.find(group=>group.adGroupId===groupId);
  if(!campaign||!group)notFound();
  return <><TestingPageHeader section="Reddit" title={group.name} description={campaign.name} redditDateFilter/><TestingBackNavigation platform="Reddit" platformHref="/bluevua/testing/reddit" query={backQuery.toString()}/><p className="mb-4 text-body-regular text-text-secondary">{data.periodLabel} · {data.period.start} – {data.period.end}</p><RedditContentPerformance campaign={{...campaign,groups:[group]}}/></>;
}
