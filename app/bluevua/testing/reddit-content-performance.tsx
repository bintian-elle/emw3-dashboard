import { CreativeSourceLink } from "@/components/application/media/creative-source-link";
import { TestingLocalizedText } from "./testing-localized-controls";

import {MetricSortScope,MetricSortHeader,MetricSortedRows} from "./metric-sorting";
import {Fragment} from "react";
import {orderTestingMetrics} from "@/lib/testing-metric-order";
import { ImageLightbox } from "@/components/application/media/image-lightbox";
import { VideoLightbox } from "@/components/application/media/video-lightbox";
import styles from "./channel-content.module.css";
import { redditContentMetrics } from "@/lib/reddit-content-testing";
import type { RedditAd, RedditCampaign } from "@/lib/testing-reddit";

function safePostUrl(value: string | null) { try { const url = new URL(value??""); return url.protocol === "https:" && (url.hostname === "reddit.com" || url.hostname.endsWith(".reddit.com") || url.hostname === "redd.it") ? url.href : null; } catch { return null; } }

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

export function RedditContentPerformance({ campaign }: { campaign: RedditCampaign }) {
  return <div className={styles.formatList}>{(["Video", "Image", "Message"] as const).map(format => {
    const groups = campaign.groups.map(group => ({ ...group, ads: group.activeAds.filter(ad => ad.contentType === format) }));
    const ads = groups.flatMap(group => group.ads);
    const label = format === "Message" ? "Freeform" : format;
    const columns=orderTestingMetrics(redditContentMetrics(campaign.kind,format));
    const expected = campaign.kind === "Awareness" ? format !== "Image" : format !== "Message";
    if (!expected) return null;
    return <MetricSortScope key={format} defaultRoas={columns.some(column=>column.key==="roas")}><section className={styles.format} aria-label={`${label} performance`}>
      <div className={styles.formatHeader}><div className={styles.formatTitle}><h3>{label} performance</h3><span className={styles.badge}>{ads.length} ads</span></div>{!ads.length&&<p className={styles.muted}>No matching {label.toLowerCase()} ads returned for this test.</p>}</div>
      {ads.length>0&&<div className={styles.tableWrap}><table className={`${styles.table} ${styles.performanceTable}`} aria-label={`${label} ad performance`}><thead><tr><th scope="col">Ad</th>{columns.map(column=><MetricSortHeader key={column.key} metric={column.key} label={column.label}/>)}</tr></thead><tbody>
       <tr><th scope="row">Total</th>{columns.map(column=><td key={column.key}>{formatValue(aggregateRedditAds(ads)[column.key],column.key)}</td>)}</tr>
       <MetricSortedRows as="fragment" rows={groups.filter(group=>group.ads.length>0).map(group=>({id:group.adGroupId,name:group.name,values:aggregateRedditAds(group.ads),content:<Fragment key={group.adGroupId}><tr><th scope="rowgroup" colSpan={columns.length+1} className={styles.groupTitle}>Ad Group: {group.name}</th></tr><MetricSortedRows as="fragment" rows={group.ads.map(ad=>({id:ad.adId,name:ad.name,values:{impressions:ad.impressions,cpc:ad.cpc,ctr:ad.ctr,revenue:ad.revenue,roas:ad.roas},content:<tr key={ad.adId} id={`ad-${ad.adId}`}><td><div className={styles.identity}>{format==='Video'&&ad.videoUrl?<VideoLightbox src={ad.videoUrl} thumbnailUrl={ad.thumbnailUrl} title={ad.name}/>:<ImageLightbox src={ad.thumbnailUrl} alt={ad.name}/>}<div className={styles.identityText}><p className={styles.redditAdName} title={ad.name}>{safePostUrl(ad.postUrl)?<CreativeSourceLink href={safePostUrl(ad.postUrl)!} name={ad.name} kind="post"/>:ad.name}</p>{ad.headline&&<p className={`${styles.muted} ${styles.redditAdName}`} title={ad.headline}>{ad.headline}</p>}{ad.body&&<details className={styles.copy}><summary><TestingLocalizedText en="View ad copy" zh="查看广告文案"/></summary><p className={styles.copy}>{ad.body}</p></details>}</div></div></td>{columns.map(column=><td key={column.key}>{formatValue(ad[column.key],column.key)}</td>)}</tr>}))}/></Fragment>}))}/>
      </tbody></table></div>}
    </section></MetricSortScope>;
  })}</div>;
}
