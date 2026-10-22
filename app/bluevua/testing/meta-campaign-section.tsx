import {MetricSortScope,MetricSortButton,MetricSortedRows} from "./metric-sorting";
import { CampaignName } from "./campaign-name";
import {orderTestingMetrics} from "@/lib/testing-metric-order";
import Link from "next/link";
import { RiGroupLine } from "@remixicon/react";
import { Chip } from "@/components/base/badges/chip";
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

export function MetaCampaignSection({data,query=""}:{data:MetaCampaignTest;query?:string}){
  return <section className="grid gap-6">{data.campaigns.map(campaign=>{
    return <article key={campaign.campaignId} className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card">
    <div className="flex flex-col gap-4 border-b border-border-table p-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-status-purple-background text-status-purple-text"><RiGroupLine className="size-5" aria-hidden/></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5 text-caption-1-semibold text-text-tertiary"><span>META ·</span><Chip variant="caption" color="purple">STRATEGY</Chip><span>CAMPAIGN</span><CampaignStatusChip status={campaign.effectiveStatus}/></div><h2 className="mt-1 break-words text-title-2-semibold text-text-primary"><CampaignName name={campaign.campaignName} channel="meta"/></h2><p className="mt-1 text-body-regular text-text-secondary">Campaign strategy by ad group audience</p></div></div>
      <div className="shrink-0 rounded-xl bg-background-secondary-default px-3 py-2 text-body-medium text-text-secondary">{data.periodLabel} · {displayDate(data.period.start)} – {displayDate(data.period.end)}</div>
    </div>
    <TestReadout channel="meta" testIdentity={campaign.campaignName} period={{label:data.periodLabel,...data.period}}>
    {campaign.adGroups.length?<MetricSortScope><MetricSortedRows rows={campaign.adGroups.map(group=>{const cover=group.activeAds[0];const href=`/bluevua/testing/meta/${group.adGroupId}${query?`?${query}`:""}`;return {id:group.adGroupId,values:Object.fromEntries(metrics.map(item=>[item.key,group[item.key] as number|null])),content:<div key={group.adGroupId} className="grid gap-5 border-b border-border-table p-5 last:border-0 hover:bg-background-primary-hover lg:grid-cols-[minmax(260px,2fr)_minmax(520px,3fr)] lg:items-center">
      <div className="flex min-w-0 items-center gap-4">{cover?.videoUrl?<VideoLightbox src={cover.videoUrl} thumbnailUrl={highResolutionCreativeUrl(cover.thumbnailUrl)} title={cover.name}/>:<ImageLightbox src={highResolutionCreativeUrl(cover?.thumbnailUrl??null)} alt={group.name}/>}<div className="min-w-0"><Link href={href} className="block break-words text-body-medium text-text-primary hover:text-button-ghost-foreground">{group.name}</Link><p className="mt-1 text-caption-2-regular text-text-tertiary">{group.activeAds.length} ads</p></div></div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-5 lg:grid-cols-6">{metrics.map(item=><div key={item.label} className="min-w-0"><dt><MetricSortButton metric={item.key} label={item.label} align="left"/></dt><dd className="mt-1 text-body-medium tabular-nums text-text-primary">{metric(group[item.key] as number|null,item.format)}</dd></div>)}</dl>
    </div>};})}/></MetricSortScope>:<p className="p-6 text-body-regular text-text-secondary">No ad group performance is available for this campaign and period.</p>}
  </TestReadout></article>})}</section>;
}
