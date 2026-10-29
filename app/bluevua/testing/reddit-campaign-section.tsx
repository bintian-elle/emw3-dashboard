import {testingCampaignAnchor,withTestingReturnTo} from "@/lib/testing-navigation";
import {MetricSortScope,MetricSortButton,MetricSortedRows} from "./metric-sorting";
import { CampaignName } from "./campaign-name";
import {orderTestingMetrics} from "@/lib/testing-metric-order";
import { RedditContentPerformance } from "./reddit-content-performance";
import Link from "@/app/bluevua/testing/testing-link";
import { TestingChannelBrand } from "./testing-channel-brand";
import styles from "./channel-content.module.css";
import { ImageLightbox } from "@/components/application/media/image-lightbox";
import type { RedditMetrics, RedditTestingData } from "@/lib/testing-reddit";
import { CampaignStatusChip } from "./campaign-status-chip";
import { TestReadout } from "./test-readout";
type RedditCampaign=RedditMetrics;

const currency=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2});const percent=new Intl.NumberFormat("en-US",{style:"percent",minimumFractionDigits:2,maximumFractionDigits:2});const decimal=new Intl.NumberFormat("en-US",{maximumFractionDigits:2});
const date=(value:string)=>new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(`${value}T00:00:00Z`));
function value(campaign:RedditMetrics,key:string){const raw=campaign[key as keyof RedditMetrics] as number|null;if(raw==null||!Number.isFinite(raw))return "—";if(["ctr","cvr"].includes(key))return percent.format(raw);if(key==="roas")return raw.toFixed(2);if(["orders"].includes(key))return decimal.format(raw);return currency.format(raw);}
const labels={Awareness:[{key:"ctr",label:"CTR"},{key:"cpm",label:"CPM"},{key:"costPerThousandReach",label:"Cost / 1K reach"},{key:"spend",label:"Spend"}],Conversion:[{key:"cpa",label:"CPA"},{key:"cvr",label:"CVR"},{key:"roas",label:"ROAS"},{key:"orders",label:"#Purchase"},{key:"revenue",label:"Revenue"},{key:"spend",label:"Spend"},{key:"ctr",label:"CTR"},{key:"cpc",label:"CPC"},{key:"cpm",label:"CPM"}]};

export function RedditCampaignSection({data,query="",contentTesting=false}:{data:RedditTestingData;query?:string;contentTesting?:boolean}){
 return <section className={styles.list}>{data.campaigns.map(campaign=><article key={campaign.campaignId} id={testingCampaignAnchor("reddit",campaign.name)} className={styles.card}>
  <header className={styles.header}><div className={styles.heading}><span className={styles.headingIcon}><TestingChannelBrand name="Reddit"/></span><div className={styles.headingText}><div className={styles.eyebrow}>REDDIT <span className={styles.badge}>{campaign.kind.toUpperCase()}</span> CAMPAIGN <CampaignStatusChip status={campaign.campaignStatus??"Active"}/></div><h2 className={styles.title}><CampaignName name={campaign.name} channel={campaign.kind==="Awareness"?"reddit-awareness":"reddit-conversion"}/></h2></div></div><p className={styles.date}>{data.periodLabel} · {date(data.period.start)} – {date(data.period.end)}</p></header>
  <TestReadout channel={contentTesting?(campaign.kind==="Awareness"?"reddit-awareness":"reddit-conversion"):undefined} testIdentity={campaign.name} period={{label:data.periodLabel,...data.period}}>
   {contentTesting?<RedditContentPerformance campaign={campaign}/>:<MetricSortScope><MetricSortedRows rows={campaign.groups.map(group=>{const cover=group.activeAds[0],href=withTestingReturnTo(`/bluevua/testing/reddit/${group.adGroupId}${query?`?${query}`:""}`,`/bluevua/testing/reddit${query?`?${query}`:""}`);return {id:group.adGroupId,values:Object.fromEntries(labels[campaign.kind].map(item=>[item.key,group[item.key as keyof typeof group] as number|null])),content:<div key={group.adGroupId} className={styles.row}>
    <div className={styles.identity}><ImageLightbox src={cover?.thumbnailUrl??null} alt={group.name}/><div className={styles.identityText}><Link href={href}>{group.name}</Link><p className={styles.muted}>{group.activeAds.length} active ads</p></div></div>
    <dl className={styles.metrics}>{orderTestingMetrics(labels[campaign.kind]).map(item=><div key={item.key}><dt><MetricSortButton metric={item.key} label={item.label} align="left"/></dt><dd>{value(group as RedditCampaign,item.key)}</dd></div>)}</dl>
   </div>};})}/></MetricSortScope>}
  </TestReadout>
 </article>)}</section>;
}
