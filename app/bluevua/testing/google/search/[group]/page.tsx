import {TestingPageHeader} from "../../../testing-page-header";
import {testingLatestCompleteDate} from "@/lib/testing-period";
import {readGoogleTestingApiData,apiGoogleAdArchive,readGoogleSearchSharedSnapshot} from "@/lib/google-testing-api";
import {safeTestingReturnTo,testingCampaignHref} from "@/lib/testing-navigation";
import {AssociatedAssets} from "../associated-assets";
import {groupAssociatedAssets} from "@/lib/google-associated-assets";
import {AdPerformanceList} from "../ad-performance-list";
import {readGoogleAdPerformanceArchive} from "@/lib/google-ad-performance-archive";
import {aggregateGoogleAdPerformance} from "@/lib/google-ad-performance";
import {isConcludedTestingNavigation} from "@/lib/testing-navigation";
import {concludedTests} from "@/lib/concluded-tests";
import {resolveTestingPeriod,testingPeriodInput,testingPeriodLabels} from "@/lib/testing-google";
import {connection} from "next/server";
import {notFound,redirect} from "next/navigation";
import {googleContentTestingInventory} from "@/lib/google-content-testing-scope";
import {readGoogleCreativeArchive} from "@/lib/google-creative-archive";
import {TestReadout} from "../../../test-readout";

export default async function GoogleSearchCreativePage({params,searchParams}:{params:Promise<{group:string}>;searchParams:Promise<{returnTo?:string;period?:string;start?:string;end?:string}>}){
 await connection();const {group:id}=await params;if(!/^\d+$/.test(id))notFound();
 const query=await searchParams;
 const returnTo=safeTestingReturnTo(query.returnTo,"/bluevua/testing/google/search");
 const archived=isConcludedTestingNavigation(`/bluevua/testing/google/search/${id}`,returnTo);
 const shared=archived?null:await readGoogleSearchSharedSnapshot();
 const inventory=archived?null:shared?.inventory??await googleContentTestingInventory();
 const archive=await readGoogleCreativeArchive()??{campaigns:[],groups:[],ads:[],assets:[]};
 const current=inventory?.ads.find(row=>row.adGroup.id===id);
 const group=(!archived&&current?current:archive.groups.find(row=>row.adGroup.id===id))??current;if(!group)notFound();
 const campaign=(!archived&&current?.campaign?current.campaign:archive.campaigns.find(item=>item.id===group.campaign.id))??current?.campaign;
 const statusOrder:Record<string,number>={ENABLED:0,ACTIVE:0,PAUSED:1,REMOVED:2};
 const ads=(inventory?inventory.ads:archive.ads).filter(row=>row.adGroup.id===id).sort((a,b)=>(statusOrder[a.adGroupAd.status]??3)-(statusOrder[b.adGroupAd.status]??3));
 const sourceAssets=shared?.assets??archive.assets;
 const assets=sourceAssets.filter(row=>row.campaign.id===group.campaign.id&&(!row.adGroup||row.adGroup.id===id)).filter((row,index,rows)=>rows.findIndex(other=>other.asset.id===row.asset.id)===index);
 const business=sourceAssets.find(row=>row.campaign.id===group.campaign.id&&(row.campaignAsset?.fieldType??row.adGroupAsset?.fieldType)==="BUSINESS_NAME")?.asset.textAsset?.text||"Bluevua";
 const logoAsset=sourceAssets.find(row=>row.campaign.id===group.campaign.id&&(row.campaignAsset?.fieldType??row.adGroupAsset?.fieldType)==="BUSINESS_LOGO")?.asset;
 const logo=logoAsset?.localMediaPath??logoAsset?.imageAsset?.fullSize?.url;
 const sitelinks=assets.map(row=>row.asset).filter(asset=>asset.sitelinkAsset);
 let performance=shared?apiGoogleAdArchive(shared.performance):await readGoogleAdPerformanceArchive();
 let origin=new URL(returnTo,"https://dashboard.local");
 for(let depth=0;depth<5&&origin.searchParams.has("returnTo");depth++)origin=new URL(safeTestingReturnTo(origin.searchParams.get("returnTo"),"/bluevua/testing/google/search"),"https://dashboard.local");
 const concludedDefinition=archived?concludedTests.find(test=>test.channel.startsWith("Google")&&campaign?.name.startsWith(test.campaignName)):undefined;
 const lifetime=concludedDefinition?.lifetime;
 const inheritedPeriod=origin.searchParams.get("period");
 // Older and nested links may only carry dates in returnTo. Put them on this
 // page as well so the selector and the report use the same selected period.
 if(!lifetime&&!query.period&&inheritedPeriod){
  const params=new URLSearchParams();
  if(query.returnTo)params.set("returnTo",returnTo);
  for(const key of ["period","start","end"]){const value=origin.searchParams.get(key);if(value)params.set(key,value);}
  redirect(`/bluevua/testing/google/search/${id}?${params.toString()}`);
 }
 const input=testingPeriodInput({period:query.period??inheritedPeriod??undefined,start:query.period?query.start:origin.searchParams.get("start")??undefined,end:query.period?query.end:origin.searchParams.get("end")??undefined});
 const period=lifetime??resolveTestingPeriod(testingLatestCompleteDate(),input);
 if(!archived&&(!performance||period.end>performance.range.end||period.start<performance.range.start))performance=apiGoogleAdArchive(await readGoogleTestingApiData());
 const metrics=performance&&period&&period.start>=performance.range.start&&period.end<=performance.range.end?aggregateGoogleAdPerformance(performance,id,period,archived?undefined:new Set(ads.map(row=>row.adGroupAd.ad.id))):null;
 const periodLabel=lifetime?"Test lifetime":testingPeriodLabels[input.preset??"lastWeek"];
 const fromArm=returnTo.startsWith("/bluevua/testing/google/concluded/");
 const backHref=fromArm||!campaign?.name?returnTo:testingCampaignHref(returnTo,"google-search",campaign.name,query);
 return <><TestingPageHeader section="Google Search" title={group.adGroup.name} description={campaign?.name} showReportingPeriod={!lifetime} backHref={backHref} backLabel={fromArm?"Back to ad groups":"Back to campaign"}/><p className="mb-4 text-caption-1-regular text-text-tertiary">Ads and creatives · {ads.length} ads</p>{period&&<p className="mb-4 text-body-medium text-text-secondary">{periodLabel} · {period.start} – {period.end}</p>}<TestReadout standalone channel={concludedDefinition||campaign?.name.startsWith("EM-Search-Nonbrand-")?"google-search":undefined} testIdentity={concludedDefinition?.campaignName??campaign?.name} period={{label:periodLabel,...period,...(concludedDefinition?{concludedTestId:concludedDefinition.id}:{})}}>{!metrics&&<p className="mb-4 text-body-regular text-text-secondary">Ad performance is not available for this reporting period.</p>}<AdPerformanceList ads={ads} metrics={metrics} businessName={business} logo={logo} sitelinks={sitelinks}/><AssociatedAssets scopes={groupAssociatedAssets(sourceAssets,group.campaign.id,id,campaign?.name??group.campaign.id,group.adGroup.name)}/></TestReadout></>;
}
