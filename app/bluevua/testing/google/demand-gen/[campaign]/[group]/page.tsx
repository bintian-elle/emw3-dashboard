import {orderTestingMetrics} from "@/lib/testing-metric-order";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Image as ImageIcon, CirclePlay, Play } from "lucide-react";
import {safeTestingReturnTo,testingCampaignHref} from "@/lib/testing-navigation";
import { TestingPageHeader } from "../../../../testing-page-header";
import { TestReadout } from "../../../../test-readout";
import { getDemandGenAds, type DemandGenAd } from "@/lib/testing-demand-gen";
import { testingPeriodInput } from "@/lib/testing-google";
import { ImageLightbox } from "@/components/application/media/image-lightbox";
import { highResolutionCreativeUrl } from "@/lib/creative-image";
import { AdTypeChip, resolveAdContentType } from "@/components/application/media/ad-type-chip";
import styles from "../../../../nova-creative-detail.module.css";

const currency=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0});const decimal=new Intl.NumberFormat("en-US",{maximumFractionDigits:2});const percent=new Intl.NumberFormat("en-US",{style:"percent",minimumFractionDigits:2,maximumFractionDigits:2});
const columns:Array<{label:string;key:keyof DemandGenAd;format:"currency"|"decimal"|"percent"|"roas"}>=orderTestingMetrics([{label:"CPA",key:"cpa",format:"currency"},{label:"CVR",key:"cvr",format:"percent"},{label:"ROAS",key:"roas",format:"roas"},{label:"#Purchase",key:"orders",format:"decimal"},{label:"Revenue",key:"revenue",format:"currency"},{label:"Spend",key:"spend",format:"currency"},{label:"CTR",key:"ctr",format:"percent"},{label:"CPC",key:"cpc",format:"currency"}]);
function value(input:number|null,format:"currency"|"decimal"|"percent"|"roas"){if(input==null||!Number.isFinite(input))return "—";if(format==="currency")return currency.format(input);if(format==="percent")return percent.format(input);if(format==="roas")return input.toFixed(2);return decimal.format(input);}
type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[];returnTo?:string|string[]};

function AdThumbnail({ad,mediaType}:{ad:DemandGenAd;mediaType:"image"|"video"}) {
  const content=<>{ad.previewUrl?<Image src={ad.previewUrl} alt={ad.name} fill sizes="80px" className={styles.thumbnailImage} />:mediaType==="image"?<ImageIcon aria-hidden />:<CirclePlay aria-hidden />}{ad.videoUrl&&<span className={styles.play}><Play aria-hidden /></span>}</>;
  return <span className={styles.thumbnail}>{content}</span>;
}

function AdIdentity({ad,mediaType}:{ad:DemandGenAd;mediaType:"image"|"video"}) {
  const identity=<span className={styles.identityText}><span title={ad.name}>{ad.name}</span><AdTypeChip type={resolveAdContentType({previewType:ad.previewType,adType:ad.adType,hasVideo:Boolean(ad.videoUrl)})}/></span>;
  return <div className={styles.identity}>{ad.videoUrl?<a href={ad.videoUrl} target="_blank" rel="noreferrer" aria-label={`Play ${ad.name} on YouTube`}><AdThumbnail ad={{...ad,previewUrl:highResolutionCreativeUrl(ad.previewUrl)}} mediaType={mediaType}/></a>:<ImageLightbox src={highResolutionCreativeUrl(ad.previewUrl)} alt={ad.name} size="lg"/>}{ad.videoUrl?<a href={ad.videoUrl} target="_blank" rel="noreferrer">{identity}</a>:identity}</div>;
}

export default async function DemandGenGroupPage({params,searchParams}:{params:Promise<{campaign:string;group:string}>;searchParams:Promise<SearchParams>}){
  const route=await params;if(!["image","video"].includes(route.campaign)||!["a","b"].includes(route.group))notFound();const query=await searchParams;const data=await getDemandGenAds(route.campaign,testingPeriodInput(query),route.group);if(!data)notFound();const groupLabel=route.group==="a"?"Group A":"Group B";const returnTo=testingCampaignHref(safeTestingReturnTo(Array.isArray(query.returnTo)?query.returnTo[0]:query.returnTo,"/bluevua/testing/google/demand-gen"),"google-demand-gen",data.campaign.campaignName,query);
  return <><TestingPageHeader section="Google Demand Gen" title={`${data.campaign.title} · ${groupLabel}`} description={`${data.campaign.campaignName} · ${data.campaign.adGroupName}`} backHref={returnTo} sharePeriod={data.period}/><TestReadout standalone channel="google-demand-gen" testIdentity={data.campaign.campaignName} period={{label:data.periodLabel,...data.period}}><section className={styles.card}><div className={styles.heading}><h2>Ads and Creative Performance</h2><p>{data.periodLabel} · Group B currently mirrors Group A</p></div>{data.ads.length?<div>{data.ads.map(ad=><article key={ad.adId} className={styles.row}><AdIdentity ad={ad} mediaType={data.campaign.mediaType}/><dl className={styles.metrics}>{columns.map(column=><div key={column.label}><dt>{column.label}</dt><dd>{value(ad[column.key] as number|null,column.format)}</dd></div>)}</dl></article>)}</div>:<p className={styles.empty}>No ad activity is available in this period.</p>}</section></TestReadout></>;
}
