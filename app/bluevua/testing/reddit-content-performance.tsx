import { ImageLightbox } from "@/components/application/media/image-lightbox";
import { VideoLightbox } from "@/components/application/media/video-lightbox";
import { Chip } from "@/components/base/badges/chip";
import { redditContentMetrics } from "@/lib/reddit-content-testing";
import type { RedditAd, RedditCampaign, RedditMetrics } from "@/lib/testing-reddit";

function formatValue(value: number | null, key: string) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (key === "ctr") return new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  if (key === "roas") return `${value.toFixed(2)}×`;
  if (key === "impressions") return new Intl.NumberFormat("en-US").format(value);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function aggregateRedditAds(ads: RedditAd[]) {
  const sum = (key: "spend" | "clicks" | "impressions" | "revenue") => ads.reduce((total, ad) => total + ad[key], 0);
  const spend = sum("spend"), clicks = sum("clicks"), impressions = sum("impressions"), revenue = sum("revenue");
  return { impressions, revenue, cpc: clicks > 0 ? spend / clicks : null, ctr: impressions > 0 ? clicks / impressions : null, roas: spend > 0 ? revenue / spend : null };
}

function Metrics({ row, kind, format }: { row: Pick<RedditMetrics, "impressions" | "cpc" | "ctr" | "revenue" | "roas">; kind: RedditCampaign["kind"]; format: RedditAd["contentType"] }) {
  return <dl className="grid grid-cols-2 gap-4 xl:grid-cols-5">{redditContentMetrics(kind, format).map(metric => <div key={metric.key}><dt className="text-caption-1-semibold text-text-tertiary">{metric.label}</dt><dd className="mt-1 text-body-medium tabular-nums text-text-primary">{formatValue(row[metric.key], metric.key)}</dd></div>)}</dl>;
}

export function RedditContentPerformance({ campaign }: { campaign: RedditCampaign }) {
  return <div className="grid gap-6 p-5">{(["Video", "Image", "Message"] as const).map(format => {
    const groups = campaign.groups.map(group => ({ ...group, ads: group.activeAds.filter(ad => ad.contentType === format) }));
    const ads = groups.flatMap(group => group.ads);
    const label = format === "Message" ? "Freeform" : format;
    const expected = campaign.kind === "Awareness" ? format !== "Image" : format !== "Message";
    if (!expected) return null;
    return <section key={format} className="overflow-hidden rounded-3xl border border-border-button-default" aria-label={`${label} performance`}>
      <div className="grid gap-4 bg-background-secondary-default p-5"><div className="flex items-center gap-3"><h3 className="text-title-3-semibold text-text-primary">{label} performance</h3><Chip variant="caption" color={format === "Video" ? "purple" : format === "Image" ? "rose" : "lime"}>{ads.length} ads</Chip></div>{ads.length > 0 ? <Metrics row={aggregateRedditAds(ads)} kind={campaign.kind} format={format}/> : <p className="text-body-regular text-text-secondary">No matching {label.toLowerCase()} ads returned for this test.</p>}</div>
      {groups.filter(group => group.ads.length > 0).map(group => <div key={group.adGroupId}><h4 className="border-t border-border-table px-5 py-3 text-body-medium text-text-secondary">Ad Group: {group.name}</h4>{group.ads.map(ad => <article key={ad.adId} className="grid gap-5 border-t border-border-table p-5 lg:grid-cols-2 lg:items-center"><div className="flex min-w-0 items-start gap-3">{format === "Video" && ad.videoUrl ? <VideoLightbox src={ad.videoUrl} thumbnailUrl={ad.thumbnailUrl} title={ad.name}/> : <ImageLightbox src={ad.thumbnailUrl} alt={ad.name}/>}<div className="min-w-0"><p className="break-words text-body-medium text-text-primary">{ad.name}</p>{ad.headline && <p className="mt-1 text-body-2-regular text-text-secondary">{ad.headline}</p>}{ad.body && <details className="mt-2"><summary className="cursor-pointer text-body-2-medium text-text-secondary">View ad copy</summary><p className="mt-2 whitespace-pre-wrap text-body-2-regular text-text-secondary">{ad.body}</p></details>}</div></div><Metrics row={ad} kind={campaign.kind} format={format}/></article>)}</div>)}
    </section>;
  })}</div>;
}
