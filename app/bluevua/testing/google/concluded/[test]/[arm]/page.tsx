import {safeTestingReturnTo,withTestingReturnTo} from "@/lib/testing-navigation";
import Link from "next/link";
import {connection} from "next/server";
import {notFound} from "next/navigation";
import {readGoogleCreativeArchive} from "@/lib/google-creative-archive";
import {concludedTests} from "@/lib/concluded-tests";

export default async function ExperimentArmCreativesPage({params,searchParams}:{params:Promise<{test:string;arm:string}>;searchParams:Promise<{returnTo?:string}>}){
 await connection();const {test:id,arm}=await params;
 if(!concludedTests.some(test=>test.id===id)||!["treatment","control"].includes(arm))notFound();
 const query=await searchParams;
 const returnTo=safeTestingReturnTo(query.returnTo,"/bluevua/testing/concluded/google");
 const currentPage=withTestingReturnTo(`/bluevua/testing/google/concluded/${id}/${arm}`,returnTo);
 const archive=await readGoogleCreativeArchive();
 const campaignName=arm==="treatment"?"EM-Search-Brand-Mar25 Brand_AbsTopPageTest_2026/07":"EM-Search-Brand-Mar25";
 const campaign=archive?.campaigns.find(item=>item.name===campaignName);
 const groups=archive?.groups.filter(row=>row.campaign.id===campaign?.id)||[];
 return <><header className="mb-6"><Link href={returnTo} className="text-body-medium text-text-secondary hover:text-text-primary">← Back to {returnTo.startsWith("/bluevua/testing/concluded")?"Google · Concluded Tests":returnTo.split("?")[0]==="/bluevua/testing"?"Testing Overview":"Google Testing Performance"}</Link><h1 className="mt-3 text-title-1-semibold text-text-primary">{arm==="treatment"?"Group A · Test":"Group B · Control"}</h1><p className="mt-2 text-body-regular text-text-secondary">{campaignName}</p></header><section className="grid gap-4" aria-label="Experiment ad groups">{groups.map(({adGroup})=><Link key={adGroup.id} href={withTestingReturnTo(`/bluevua/testing/google/search/${adGroup.id}`,currentPage)} className="rounded-3xl border border-border-button-default bg-background-primary-default p-6 text-text-primary outline-none hover:bg-background-primary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"><h2 className="text-title-3-semibold text-status-blue-text underline underline-offset-4">{adGroup.name}</h2><p className="mt-2 text-body-regular text-text-secondary">{archive?.ads.filter(ad=>ad.adGroup.id===adGroup.id).length} ads · View creatives →</p></Link>)}</section>{!groups.length&&<p className="text-body-regular text-text-secondary">Creative archive is not available yet.</p>}</>;
}
