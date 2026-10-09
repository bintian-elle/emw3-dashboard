import {safeTestingReturnTo} from "@/lib/testing-navigation";
import {AssociatedAssets} from "../associated-assets";
import {groupAssociatedAssets} from "@/lib/google-associated-assets";
import {AdPerformanceList} from "../ad-performance-list";
import {readGoogleAdPerformanceArchive} from "@/lib/google-ad-performance-archive";
import {aggregateGoogleAdPerformance} from "@/lib/google-ad-performance";
import {isConcludedTestingNavigation} from "@/lib/testing-navigation";
import {concludedTests} from "@/lib/concluded-tests";
import {resolveTestingPeriod,testingPeriodInput,testingPeriodLabels} from "@/lib/testing-google";
import Link from "next/link";
import {connection} from "next/server";
import {notFound} from "next/navigation";
import {readGoogleCreativeArchive} from "@/lib/google-creative-archive";

export default async function GoogleSearchCreativePage({params,searchParams}:{params:Promise<{group:string}>;searchParams:Promise<{returnTo?:string}>}){
 await connection();const {group:id}=await params;if(!/^\d+$/.test(id))notFound();
 const query=await searchParams;
 const returnTo=safeTestingReturnTo(query.returnTo,"/bluevua/testing/google");
 const archive=await readGoogleCreativeArchive();const group=archive?.groups.find(row=>row.adGroup.id===id);if(!archive||!group)notFound();
 const campaign=archive.campaigns.find(item=>item.id===group.campaign.id);
 const statusOrder:Record<string,number>={ENABLED:0,ACTIVE:0,PAUSED:1,REMOVED:2};
 const ads=archive.ads.filter(row=>row.adGroup.id===id).sort((a,b)=>(statusOrder[a.adGroupAd.status]??3)-(statusOrder[b.adGroupAd.status]??3));
 const assets=archive.assets.filter(row=>row.campaign.id===group.campaign.id&&(!row.adGroup||row.adGroup.id===id)).filter((row,index,rows)=>rows.findIndex(other=>other.asset.id===row.asset.id)===index);
 const business=archive.assets.find(row=>row.campaign.id===group.campaign.id&&(row.campaignAsset?.fieldType??row.adGroupAsset?.fieldType)==="BUSINESS_NAME")?.asset.textAsset?.text||"Bluevua";
 const logo=archive.assets.find(row=>row.campaign.id===group.campaign.id&&(row.campaignAsset?.fieldType??row.adGroupAsset?.fieldType)==="BUSINESS_LOGO")?.asset.localMediaPath;
 const sitelinks=assets.map(row=>row.asset).filter(asset=>asset.sitelinkAsset);
 const performance=await readGoogleAdPerformanceArchive();
 let origin=new URL(returnTo,"https://dashboard.local");
 for(let depth=0;depth<5&&origin.searchParams.has("returnTo");depth++)origin=new URL(safeTestingReturnTo(origin.searchParams.get("returnTo"),"/bluevua/testing/google"),"https://dashboard.local");
 const archived=isConcludedTestingNavigation(`/bluevua/testing/google/search/${id}`,returnTo);
 const lifetime=archived?concludedTests.find(test=>test.channel==="Google"&&campaign?.name.startsWith(test.campaignName))?.lifetime:null;
 const input=testingPeriodInput({period:origin.searchParams.get("period")??undefined,start:origin.searchParams.get("start")??undefined,end:origin.searchParams.get("end")??undefined});
 const period=lifetime??(performance?resolveTestingPeriod(performance.range.end,input):null);
 const metrics=performance&&period&&period.start>=performance.range.start&&period.end<=performance.range.end?aggregateGoogleAdPerformance(performance,id,period):null;
 const periodLabel=lifetime?"Test lifetime":testingPeriodLabels[input.preset??"lastWeek"];
 return <><header className="mb-6"><Link href={returnTo} className="text-body-medium text-text-secondary hover:text-text-primary">← {returnTo.startsWith("/bluevua/testing/google/concluded/")?"Back to experiment ad groups":"Google Testing Performance"}</Link><h1 className="mt-3 text-title-1-semibold text-text-primary">{group.adGroup.name}</h1><p className="mt-2 text-body-regular text-text-secondary">{campaign?.name}</p><p className="mt-1 text-caption-1-regular text-text-tertiary">Ads and creatives · {ads.length} ads</p></header>{period&&<p className="mb-4 text-body-medium text-text-secondary">{periodLabel} · {period.start} – {period.end}</p>}{!metrics&&<p className="mb-4 text-body-regular text-text-secondary">Ad performance is not available for this reporting period.</p>}<AdPerformanceList ads={ads} metrics={metrics} businessName={business} logo={logo} sitelinks={sitelinks}/><AssociatedAssets scopes={groupAssociatedAssets(archive.assets,group.campaign.id,id,campaign?.name??group.campaign.id,group.adGroup.name)}/></>;
}
