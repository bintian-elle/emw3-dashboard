import Link from "next/link";
import { RiGroupLine } from "@remixicon/react";
import { Chip } from "@/components/base/badges/chip";
import { ImageLightbox } from "@/components/application/media/image-lightbox";
import { highResolutionCreativeUrl } from "@/lib/creative-image";
import type { MetaAdGroupMetric, MetaCampaignTest } from "@/lib/testing-meta";

const currency=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0});
const decimal=new Intl.NumberFormat("en-US",{maximumFractionDigits:2});
const percent=new Intl.NumberFormat("en-US",{style:"percent",minimumFractionDigits:2,maximumFractionDigits:2});
const metrics:Array<{label:string;key:keyof MetaAdGroupMetric;format:"currency"|"decimal"|"percent"|"roas"}>=[
  {label:"CPA",key:"cpa",format:"currency"},{label:"CVR",key:"cvr",format:"percent"},{label:"ROAS",key:"roas",format:"roas"},{label:"Orders",key:"orders",format:"decimal"},{label:"Revenue",key:"revenue",format:"currency"},
  {label:"Spend",key:"spend",format:"currency"},{label:"CTR",key:"ctr",format:"percent"},{label:"CPC",key:"cpc",format:"currency"},{label:"CPM",key:"cpm",format:"currency"},{label:"Hook rate",key:"hookRate",format:"percent"},
];
function metric(value:number|null,format:"currency"|"decimal"|"percent"|"roas"){if(value==null||!Number.isFinite(value))return "—";if(format==="currency")return currency.format(value);if(format==="percent")return percent.format(value);if(format==="roas")return value.toFixed(2);return decimal.format(value);}
function displayDate(value:string){return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(`${value}T00:00:00Z`));}

export function MetaCampaignSection({data,query=""}:{data:MetaCampaignTest;query?:string}){
  return <section className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card">
    <div className="flex flex-col gap-4 border-b border-border-table p-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-status-purple-background text-status-purple-text"><RiGroupLine className="size-5" aria-hidden/></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5 text-caption-1-semibold text-text-tertiary"><span>META ·</span><Chip variant="caption" color="purple">STRATEGY</Chip><span>CAMPAIGN</span></div><h2 className="mt-1 break-words text-title-2-semibold text-text-primary">{data.campaignName}</h2><p className="mt-1 text-body-regular text-text-secondary">Campaign strategy by ad group audience</p></div></div>
      <div className="shrink-0 rounded-xl bg-background-secondary-default px-3 py-2 text-body-medium text-text-secondary">{data.periodLabel} · {displayDate(data.period.start)} – {displayDate(data.period.end)}</div>
    </div>
    {data.adGroups.length?<div>{data.adGroups.map(group=>{const cover=group.activeAds[0];const href=`/bluevua/testing/meta/${group.adGroupId}${query?`?${query}`:""}`;return <article key={group.adGroupId} className="grid gap-5 border-b border-border-table p-5 last:border-0 hover:bg-background-primary-hover lg:grid-cols-[minmax(260px,2fr)_minmax(520px,3fr)] lg:items-center">
      <div className="flex min-w-0 items-center gap-4"><ImageLightbox src={highResolutionCreativeUrl(cover?.thumbnailUrl??null)} alt={group.name}/><div className="min-w-0"><Link href={href} className="block break-words text-body-medium text-text-primary hover:text-button-ghost-foreground">{group.name}</Link><p className="mt-1 text-caption-2-regular text-text-tertiary">{group.activeAds.length} active ads</p></div></div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">{metrics.map(item=><div key={item.label} className="min-w-0"><dt className="text-caption-1-semibold text-text-tertiary">{item.label}</dt><dd className="mt-1 text-body-medium tabular-nums text-text-primary">{metric(group[item.key] as number|null,item.format)}</dd></div>)}</dl>
    </article>})}</div>:<p className="p-6 text-body-regular text-text-secondary">No ad group performance is available for this campaign and period.</p>}
  </section>;
}
