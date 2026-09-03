import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RiArrowLeftLine, RiImageLine, RiPlayCircleLine, RiYoutubeFill } from "@remixicon/react";
import { TestingPageHeader } from "../../../../testing-page-header";
import { getDemandGenAds, type DemandGenAd } from "@/lib/testing-demand-gen";
import { testingPeriodInput } from "@/lib/testing-google";
import { ImageLightbox } from "@/components/application/media/image-lightbox";
import { highResolutionCreativeUrl } from "@/lib/creative-image";
import { AdTypeChip, resolveAdContentType } from "@/components/application/media/ad-type-chip";

const currency=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0});const decimal=new Intl.NumberFormat("en-US",{maximumFractionDigits:2});const percent=new Intl.NumberFormat("en-US",{style:"percent",minimumFractionDigits:2,maximumFractionDigits:2});
const columns:Array<{label:string;key:keyof DemandGenAd;format:"currency"|"decimal"|"percent"|"roas"}>=[{label:"CPA",key:"cpa",format:"currency"},{label:"CVR",key:"cvr",format:"percent"},{label:"ROAS",key:"roas",format:"roas"},{label:"Orders",key:"orders",format:"decimal"},{label:"Revenue",key:"revenue",format:"currency"},{label:"Spend",key:"spend",format:"currency"},{label:"CTR",key:"ctr",format:"percent"},{label:"CPC",key:"cpc",format:"currency"}];
function value(input:number|null,format:"currency"|"decimal"|"percent"|"roas"){if(input==null||!Number.isFinite(input))return "—";if(format==="currency")return currency.format(input);if(format==="percent")return percent.format(input);if(format==="roas")return input.toFixed(2);return decimal.format(input);}
type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[]};

function AdThumbnail({ad,mediaType}:{ad:DemandGenAd;mediaType:"image"|"video"}) {
  const content=<>{ad.previewUrl?<Image src={ad.previewUrl} alt={ad.name} fill sizes="80px" className="pointer-events-none object-cover" />:mediaType==="image"?<RiImageLine className="size-6 text-foreground-icon-tertiary" aria-hidden />:<RiPlayCircleLine className="size-7 text-foreground-icon-tertiary" aria-hidden />}{ad.videoUrl&&<span className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="flex size-9 items-center justify-center rounded-full bg-background-primary-default shadow-card"><RiYoutubeFill className="size-6 text-text-error-primary" aria-hidden /></span></span>}</>;
  return <span className="pointer-events-none relative isolate flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background-secondary-default">{content}</span>;
}

function AdIdentity({ad,mediaType}:{ad:DemandGenAd;mediaType:"image"|"video"}) {
  const identity=<span className="min-w-0"><span title={ad.name} className="break-words text-body-medium text-text-primary">{ad.name}</span><AdTypeChip className="mt-1" type={resolveAdContentType({previewType:ad.previewType,adType:ad.adType,hasVideo:Boolean(ad.videoUrl)})}/></span>;
  return <div className="flex min-w-0 items-center gap-3">{ad.videoUrl?<a href={ad.videoUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring" aria-label={`Play ${ad.name} on YouTube`}><AdThumbnail ad={{...ad,previewUrl:highResolutionCreativeUrl(ad.previewUrl)}} mediaType={mediaType}/></a>:<ImageLightbox src={highResolutionCreativeUrl(ad.previewUrl)} alt={ad.name} size="lg"/>}{ad.videoUrl?<a href={ad.videoUrl} target="_blank" rel="noreferrer" className="min-w-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring">{identity}</a>:identity}</div>;
}

export default async function DemandGenGroupPage({params,searchParams}:{params:Promise<{campaign:string;group:string}>;searchParams:Promise<SearchParams>}){
  const route=await params;if(!["image","video"].includes(route.campaign)||!["a","b"].includes(route.group))notFound();const query=await searchParams;const data=await getDemandGenAds(route.campaign,testingPeriodInput(query));if(!data)notFound();const groupLabel=route.group==="a"?"Group A":"Group B";const backQuery=new URLSearchParams();for(const [key,raw] of Object.entries(query)){const item=Array.isArray(raw)?raw[0]:raw;if(item)backQuery.set(key,item);}
  return <><TestingPageHeader section="Google" title={`${data.campaign.title} · ${groupLabel}`} description={`${data.campaign.campaignName} · ${data.campaign.adGroupName}`} /><Link href={`/bluevua/testing/google${backQuery.size?`?${backQuery.toString()}`:""}`} className="mb-4 inline-flex items-center gap-2 text-body-medium text-text-secondary hover:text-text-primary"><RiArrowLeftLine className="size-4" aria-hidden />Back to Google tests</Link><section className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card"><div className="border-b border-border-table p-5"><h2 className="text-title-3-semibold text-text-primary">Ads and Creative Performance</h2><p className="mt-1 text-body-regular text-text-secondary">{data.periodLabel} · Group B currently mirrors Group A</p></div>{data.ads.length?<div>{data.ads.map(ad=><article key={ad.adId} className="grid gap-5 border-b border-border-table p-5 last:border-0 hover:bg-background-primary-hover lg:grid-cols-[minmax(220px,1.7fr)_minmax(0,5fr)] lg:items-center"><AdIdentity ad={ad} mediaType={data.campaign.mediaType}/><dl className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4 lg:grid-cols-8">{columns.map(column=><div key={column.label} className="min-w-0"><dt className="text-caption-1-semibold text-text-tertiary">{column.label}</dt><dd className="mt-1 text-body-medium tabular-nums text-text-primary">{value(ad[column.key] as number|null,column.format)}</dd></div>)}</dl></article>)}</div>:<p className="p-6 text-body-regular text-text-secondary">No ad activity is available in this period.</p>}</section></>;
}
