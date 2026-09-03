import { notFound } from "next/navigation";
import { TestingPageHeader } from "../../testing-page-header";
import { TestingBackNavigation } from "../../testing-back-navigation";
import { ImageLightbox } from "@/components/application/media/image-lightbox";
import { VideoLightbox } from "@/components/application/media/video-lightbox";
import { AdTypeChip } from "@/components/application/media/ad-type-chip";
import { highResolutionCreativeUrl } from "@/lib/creative-image";
import { testingPeriodInput } from "@/lib/testing-google";
import { getMetaCampaignTest, type MetaActiveAd } from "@/lib/testing-meta";

const currency=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0});
const decimal=new Intl.NumberFormat("en-US",{maximumFractionDigits:2});
const percent=new Intl.NumberFormat("en-US",{style:"percent",minimumFractionDigits:2,maximumFractionDigits:2});
const metrics:Array<{label:string;key:keyof MetaActiveAd;format:"currency"|"decimal"|"percent"|"roas"}>=[
  {label:"CPA",key:"cpa",format:"currency"},{label:"CVR",key:"cvr",format:"percent"},{label:"ROAS",key:"roas",format:"roas"},{label:"Orders",key:"orders",format:"decimal"},{label:"Revenue",key:"revenue",format:"currency"},
  {label:"Spend",key:"spend",format:"currency"},{label:"CTR",key:"ctr",format:"percent"},{label:"CPC",key:"cpc",format:"currency"},{label:"CPM",key:"cpm",format:"currency"},{label:"Hook rate",key:"hookRate",format:"percent"},
];
function metric(value:number|null,format:"currency"|"decimal"|"percent"|"roas"){if(value==null||!Number.isFinite(value))return "—";if(format==="currency")return currency.format(value);if(format==="percent")return percent.format(value);if(format==="roas")return value.toFixed(2);return decimal.format(value);}
type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[]};

function AdIdentity({ad}:{ad:MetaActiveAd}){const src=highResolutionCreativeUrl(ad.thumbnailUrl);return <div className="flex min-w-0 items-center gap-3">{ad.videoUrl?<VideoLightbox src={ad.videoUrl} thumbnailUrl={src} title={ad.name}/>:<ImageLightbox src={src} alt={ad.name} size="lg"/>}<div className="min-w-0"><p className="break-words text-body-medium text-text-primary">{ad.name}</p><AdTypeChip className="mt-1" type={ad.mediaType}/></div></div>;}

export default async function MetaAdGroupPage({params,searchParams}:{params:Promise<{group:string}>;searchParams:Promise<SearchParams>}){
  const route=await params;const query=await searchParams;const data=await getMetaCampaignTest(testingPeriodInput(query));const group=data.adGroups.find(item=>item.adGroupId===route.group);if(!group)notFound();
  const backQuery=new URLSearchParams();for(const [key,raw] of Object.entries(query)){const item=Array.isArray(raw)?raw[0]:raw;if(item)backQuery.set(key,item);}
  return <><TestingPageHeader section="Meta" title={group.name} description={data.campaignName}/><TestingBackNavigation platform="Meta" platformHref="/bluevua/testing/meta" query={backQuery.toString()}/><section className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card"><div className="border-b border-border-table p-5"><h2 className="text-title-3-semibold text-text-primary">Active Ads and Creative Performance</h2><p className="mt-1 text-body-regular text-text-secondary">{data.periodLabel} · {group.activeAds.length} active ads</p></div>{group.activeAds.length?<div>{group.activeAds.map(ad=><article key={ad.adId} className="grid gap-5 border-b border-border-table p-5 last:border-0 hover:bg-background-primary-hover lg:grid-cols-[minmax(220px,1.7fr)_minmax(0,6fr)] lg:items-center"><AdIdentity ad={ad}/><dl className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-5 lg:grid-cols-10">{metrics.map(item=><div key={item.label} className="min-w-0"><dt className="text-caption-1-semibold text-text-tertiary">{item.label}</dt><dd className="mt-1 text-body-medium tabular-nums text-text-primary">{metric(ad[item.key] as number|null,item.format)}</dd></div>)}</dl></article>)}</div>:<p className="p-6 text-body-regular text-text-secondary">No active ads are available in this ad group.</p>}</section></>;
}
