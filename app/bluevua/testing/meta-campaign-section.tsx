import {testingCampaignAnchor,withTestingReturnTo} from "@/lib/testing-navigation";
import {MetricSortScope,MetricSortButton,MetricSortedRows} from "./metric-sorting";
import { CampaignName } from "./campaign-name";
import {orderTestingMetrics} from "@/lib/testing-metric-order";
import Link from "@/app/bluevua/testing/testing-link";
import { TestingChannelBrand } from "./testing-channel-brand";
import styles from "./channel-content.module.css";
import { VideoLightbox } from "@/components/application/media/video-lightbox";
import { ImageLightbox } from "@/components/application/media/image-lightbox";
import { highResolutionCreativeUrl } from "@/lib/creative-image";
import type { MetaAdGroupMetric, MetaCampaignTest } from "@/lib/testing-meta";
import { CampaignStatusChip } from "./campaign-status-chip";
import { TestReadout } from "./test-readout";

const currency=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0});
const decimal=new Intl.NumberFormat("en-US",{maximumFractionDigits:2});
const percent=new Intl.NumberFormat("en-US",{style:"percent",minimumFractionDigits:2,maximumFractionDigits:2});
const metrics:Array<{label:string;key:keyof MetaAdGroupMetric;format:"currency"|"decimal"|"percent"|"roas"|"cost"}>=orderTestingMetrics([
  {label:"CPA",key:"cpa",format:"currency"},{label:"CVR",key:"cvr",format:"percent"},{label:"ROAS",key:"roas",format:"roas"},{label:"#Purchase",key:"orders",format:"decimal"},{label:"Revenue",key:"revenue",format:"currency"},
  {label:"Spend",key:"spend",format:"currency"},{label:"CTR",key:"ctr",format:"percent"},{label:"CPC",key:"cpc",format:"currency"},{label:"CPM",key:"cpm",format:"currency"},{label:"Unique reach",key:"reach",format:"decimal"},{label:"Cost / reach",key:"costPerReach",format:"cost"},
]);
function metric(value:number|null,format:"currency"|"decimal"|"percent"|"roas"|"cost"){if(value==null||!Number.isFinite(value))return "—";if(format==="cost")return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:4}).format(value);if(format==="currency")return currency.format(value);if(format==="percent")return percent.format(value);if(format==="roas")return value.toFixed(2);return decimal.format(value);}
function displayDate(value:string){return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(`${value}T00:00:00Z`));}

export function MetaCampaignSection({data,query="",returnTo}:{data:MetaCampaignTest;query?:string;returnTo?:string}){
 return <section className={styles.list}>{data.campaigns.map(campaign=><article key={campaign.campaignId} id={testingCampaignAnchor("meta",campaign.campaignName)} className={styles.card}>
  <header className={styles.header}><div className={styles.heading}><span className={styles.headingIcon}><TestingChannelBrand name="Meta"/></span><div className={styles.headingText}><div className={styles.eyebrow}>META <span className={styles.badge}>STRATEGY</span> CAMPAIGN <CampaignStatusChip status={campaign.effectiveStatus}/></div><h2 className={styles.title}><CampaignName name={campaign.campaignName} channel="meta"/></h2></div></div><p className={styles.date}>{data.periodLabel} · {displayDate(data.period.start)} – {displayDate(data.period.end)}</p></header>
  <TestReadout channel="meta" testIdentity={campaign.campaignName} period={{label:data.periodLabel,...data.period}}>
   {campaign.adGroups.length?<MetricSortScope><MetricSortedRows rows={campaign.adGroups.map(group=>{const cover=group.activeAds[0];const href=withTestingReturnTo(`/bluevua/testing/meta/${group.adGroupId}${query?`?${query}`:""}`,returnTo??`/bluevua/testing/meta${query?`?${query}`:""}`);return {id:group.adGroupId,values:Object.fromEntries(metrics.map(item=>[item.key,group[item.key] as number|null])),content:<div key={group.adGroupId} className={styles.row}>
    <div className={styles.identity}>{cover?.videoUrl?<VideoLightbox src={cover.videoUrl} thumbnailUrl={highResolutionCreativeUrl(cover.thumbnailUrl)} title={cover.name}/>:<ImageLightbox src={highResolutionCreativeUrl(cover?.thumbnailUrl??null)} alt={group.name}/>}<div className={styles.identityText}><Link href={href}>{group.name}</Link><p className={styles.muted}>{group.activeAds.length} ads</p></div></div>
    <dl className={styles.metrics}>{metrics.map(item=><div key={item.label}><dt><MetricSortButton metric={item.key} label={item.label} align="left"/></dt><dd>{metric(group[item.key] as number|null,item.format)}</dd></div>)}</dl>
   </div>};})}/></MetricSortScope>:<p className={styles.empty}>No ad group performance is available for this campaign and period.</p>}
  </TestReadout>
 </article>)}</section>;
}
