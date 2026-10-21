import Link from "next/link";
import {googleVideoNames} from "@/lib/google-video-names";
import {notFound} from "next/navigation";
import {RiArrowLeftLine} from "@remixicon/react";
import {Chip} from "@/components/base/badges/chip";
import {ImageLightbox} from "@/components/application/media/image-lightbox";
import {VideoLightbox} from "@/components/application/media/video-lightbox";
import {getExpandedGoogleTesting} from "@/lib/google-expanded-content-testing";
import {safeTestingReturnTo} from "@/lib/testing-navigation";
import {testingPeriodInput} from "@/lib/testing-google";
import {TestingPageHeader} from "./testing-page-header";
import {TestReadout} from "./test-readout";
type SearchParams={period?:string;start?:string;end?:string;returnTo?:string};
export async function GoogleTestingAssetPage({params,searchParams,channel="pmax"}:{params:Promise<{group:string}>;searchParams:Promise<SearchParams>;channel?:"pmax"|"demand-gen"}){
 const {group:id}=await params;if(!/^\d+$/.test(id))notFound();
 const query=await searchParams,data=await getExpandedGoogleTesting(channel,testingPeriodInput(query));
 const pmax=channel==="pmax",platform=pmax?"Google PMAX":"Google Demand Gen";
 const campaign=data.campaigns.find(c=>c.groups.some(g=>g.rows.some(row=>row.id===id)));const group=campaign?.groups.find(g=>g.rows.some(row=>row.id===id));const row=group?.rows.find(row=>row.id===id);
 if(!campaign||!group||!row)notFound();
 const returnTo=safeTestingReturnTo(query.returnTo,`/bluevua/testing/google/${channel}`);
 const videoNames=await googleVideoNames(row.assets);
 const images=row.assets.filter(asset=>asset.imageAsset),videos=row.assets.filter(asset=>asset.youtubeVideoAsset);
 return <><TestingPageHeader section={platform} title={row.name} description={campaign.name}/><Link href={returnTo} className="mb-5 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-body-medium text-text-secondary outline-none hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"><RiArrowLeftLine className="size-4" aria-hidden/>Back to {returnTo.split("?")[0]==="/bluevua/testing"?"Testing Overview":`${platform} tests`}</Link><div className="mb-6 flex flex-wrap items-center gap-3"><Chip color={row.status==="ENABLED"?"lime":"soft"} variant="caption">{row.status}</Chip><p className="text-body-regular text-text-secondary">{pmax?"Asset group":"Ad group"} · {group.name}</p></div><TestReadout standalone channel={pmax?"google-pmax":"google-demand-gen"} testIdentity={campaign.name} period={{label:data.periodLabel,...data.period}}><div className="grid gap-6">{[{title:"Images",assets:images},{title:"Videos",assets:videos}].map(({title,assets})=><section key={title} className="rounded-3xl border border-border-button-default bg-background-primary-default p-6"><h2 className="text-title-3-semibold text-text-primary">{title} · {assets.length}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{assets.map(asset=><div key={asset.id} className="flex min-w-0 items-start gap-3 rounded-xl bg-background-secondary-default p-4">{asset.youtubeVideoAsset?.youtubeVideoId?<VideoLightbox src={`https://www.youtube.com/embed/${asset.youtubeVideoAsset.youtubeVideoId}`} thumbnailUrl={`/api/google/creative-media/youtube/${asset.youtubeVideoAsset.youtubeVideoId}`} title={videoNames[asset.id]||asset.name||row.name}/>:<ImageLightbox src={asset.imageAsset?.fullSize?.url??null} alt={asset.name||group.name} unoptimized/>}<p className="min-w-0 break-words text-body-regular text-text-secondary">{videoNames[asset.id]||asset.name||(title==="Images"?`Image ${asset.id}`:row.name)}</p></div>)}</div>{!assets.length&&<p className="mt-3 text-body-regular text-text-secondary">No {title.toLowerCase()} attached to this {pmax?"asset group":"ad"}.</p>}</section>)}<section className="rounded-3xl border border-border-button-default bg-background-primary-default p-6"><h2 className="text-title-3-semibold text-text-primary">Text assets · {row.texts.length}</h2><div className="mt-4 grid gap-3">{row.texts.map((text,index)=><p key={`${index}-${text}`} className="rounded-xl bg-background-secondary-default p-4 text-body-regular text-text-primary">{text}</p>)}</div></section></div></TestReadout></>;
}

