import {safeTestingReturnTo,testingCampaignHref} from "@/lib/testing-navigation";
import { CreativeSourceLink } from "@/components/application/media/creative-source-link";
import {MetricSortScope,MetricSortButton,MetricSortedRows} from "../../metric-sorting";
import {orderTestingMetrics} from "@/lib/testing-metric-order";
import { notFound } from "next/navigation";
import { TestingPageHeader } from "../../testing-page-header";
import { ImageLightbox } from "@/components/application/media/image-lightbox";
import { VideoLightbox } from "@/components/application/media/video-lightbox";
import styles from "../../channel-content.module.css";
import { highResolutionCreativeUrl } from "@/lib/creative-image";
import { testingPeriodInput } from "@/lib/testing-google";
import { getMetaCampaignTest, type MetaActiveAd } from "@/lib/testing-meta";
import { TestReadout } from "../../test-readout";

const currency=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0});
const decimal=new Intl.NumberFormat("en-US",{maximumFractionDigits:2});
const percent=new Intl.NumberFormat("en-US",{style:"percent",minimumFractionDigits:2,maximumFractionDigits:2});
const metrics:Array<{label:string;key:keyof MetaActiveAd;format:"currency"|"decimal"|"percent"|"roas"|"cost"}>=orderTestingMetrics([
  {label:"CPA",key:"cpa",format:"currency"},{label:"CVR",key:"cvr",format:"percent"},{label:"ROAS",key:"roas",format:"roas"},{label:"#Purchase",key:"orders",format:"decimal"},{label:"Revenue",key:"revenue",format:"currency"},
  {label:"Spend",key:"spend",format:"currency"},{label:"CTR",key:"ctr",format:"percent"},{label:"CPC",key:"cpc",format:"currency"},{label:"CPM",key:"cpm",format:"currency"},{label:"Unique reach",key:"reach",format:"decimal"},{label:"Cost / reach",key:"costPerReach",format:"cost"},{label:"Hook rate",key:"hookRate",format:"percent"},
]);
function metric(value:number|null,format:"currency"|"decimal"|"percent"|"roas"|"cost"){if(value==null||!Number.isFinite(value))return "—";if(format==="cost")return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:4}).format(value);if(format==="currency")return currency.format(value);if(format==="percent")return percent.format(value);if(format==="roas")return value.toFixed(2);return decimal.format(value);}
type SearchParams={period?:string|string[];start?:string|string[];end?:string|string[];returnTo?:string|string[]};

function AdIdentity({ad}:{ad:MetaActiveAd}){const src=highResolutionCreativeUrl(ad.thumbnailUrl);return <div className={styles.identity}>{ad.videoUrl?<VideoLightbox src={ad.videoUrl} thumbnailUrl={src} title={ad.name}/>:<ImageLightbox src={src} alt={ad.name} size="lg"/>}<div className={styles.identityText}><p >{(ad.postUrl||ad.previewUrl)?<CreativeSourceLink href={(ad.postUrl||ad.previewUrl)!} name={ad.name} kind={ad.postUrl?"post":"preview"}/>:ad.name}</p><span className={styles.badge}>{ad.mediaType}</span></div></div>;}

export default async function MetaAdGroupPage({params,searchParams}:{params:Promise<{group:string}>;searchParams:Promise<SearchParams>}){
  const route=await params;const query=await searchParams;const data=await getMetaCampaignTest(testingPeriodInput(query));const group=data.adGroups.find(item=>item.adGroupId===route.group);if(!group)notFound();
  const rawReturn=Array.isArray(query.returnTo)?query.returnTo[0]:query.returnTo;
  const returnTo=safeTestingReturnTo(rawReturn,"/bluevua/testing/meta");
  const backHref=testingCampaignHref(returnTo,"meta",group.campaignName,query);
  return <><TestingPageHeader section="Meta" title={group.name} description={group.campaignName} backHref={backHref} sharePeriod={data.period}/><TestReadout standalone channel="meta" testIdentity={group.campaignName} period={{label:data.periodLabel,...data.period}}><section className={styles.card}><div className={styles.header}><h2 className={styles.title}>Ads and Creative Performance</h2><p className={styles.muted}>{data.periodLabel} · {group.activeAds.length} ads</p></div>{group.activeAds.length?<MetricSortScope><MetricSortedRows rows={group.activeAds.map(ad=>({id:ad.adId,values:Object.fromEntries(metrics.map(item=>[item.key,ad[item.key] as number|null])),content:<article key={ad.adId} id={`ad-${ad.adId}`} className={styles.row}><AdIdentity ad={ad}/><dl className={styles.metrics}>{metrics.map(item=><div key={item.label} className={styles.identityText}><dt><MetricSortButton metric={item.key} label={item.label} align="left"/></dt><dd >{metric(ad[item.key] as number|null,item.format)}</dd></div>)}</dl></article>}))}/></MetricSortScope>:<p className={styles.empty}>No ads are available in this ad group.</p>}</section></TestReadout></>;
}
