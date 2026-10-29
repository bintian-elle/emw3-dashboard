import {MetricSortScope,MetricSortHeader,MetricSortedRows} from "./metric-sorting";
import { CampaignName } from "./campaign-name";
import { TestingChannelBrand } from "./testing-channel-brand";
import styles from "./channel-content.module.css";
import { EmailLightbox } from "@/components/application/media/email-lightbox";
import type { EdmTestingData } from "@/lib/testing-edm";
import { CampaignStatusChip } from "./campaign-status-chip";
import { TestReadout } from "./test-readout";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));

export function EdmCampaignSection({data}:{data:EdmTestingData}){
 return <section className={styles.list}>
  {!data.campaigns.length&&<p className={`${styles.card} ${styles.empty}`}>No confirmed EDM content test matches this reporting period.</p>}
  {data.campaigns.map(campaign=><article key={campaign.campaignId} className={styles.card}>
   <header className={styles.header}><div className={styles.heading}><span className={styles.headingIcon}><TestingChannelBrand name="EDM"/></span><div className={styles.headingText}><div className={styles.eyebrow}>EDM <span className={styles.badge}>A/B TEST</span> CAMPAIGN <CampaignStatusChip status={campaign.campaignStatus}/><span className={styles.badge}>{campaign.hasData?"Performance available":"Awaiting report"}</span></div><h2 className={styles.title}><CampaignName name={campaign.campaignName} channel="edm"/></h2>{campaign.sendDate&&<p className={styles.muted}>{campaign.hasData?"Sent":"Scheduled"} · {date(campaign.sendDate)}</p>}</div></div><p className={styles.date}>{data.periodLabel} · {date(data.period.start)} – {date(data.period.end)}</p></header>
   <TestReadout channel="edm" testIdentity={campaign.campaignName} period={{label:data.periodLabel,...data.period}}><MetricSortScope><div className={styles.tableWrap}><table className={styles.table}>
    <colgroup><col style={{width:"32%"}}/>{Array.from({length:6},(_,index)=><col key={index}/>)}</colgroup>
    <thead><tr><th scope="col">Email</th>{["Total Revenue","#Purchase","Click Rate","Module 2 CTR","Open Rate","Delivered"].map(metric=><MetricSortHeader key={metric} metric={metric} label={metric}/>)}</tr></thead>
    <MetricSortedRows as="tbody" rows={campaign.tests.map(test=>({id:test.variationId,values:test.hasData?{"Total Revenue":test.revenue,"#Purchase":test.orders,"Click Rate":test.clickRate,"Module 2 CTR":test.secondModuleClickRate,"Open Rate":test.openRate,Delivered:test.delivered}:{},content:<tr key={test.variationId}>
     <td><div className={styles.identity}><EmailLightbox html={test.html} title={`${test.label} · ${test.subject}`}/><div className={styles.identityText}><span className={styles.badge}>{test.label}</span><p>{test.fromLabel}</p><p className={styles.muted}>{test.subject}</p>{test.previewText&&<p className={styles.muted}>{test.previewText}</p>}</div></div></td>
     <td>{test.hasData?currency.format(test.revenue):"—"}</td><td>{test.hasData?number.format(test.orders):"—"}</td><td>{test.clickRate==null?"—":percent.format(test.clickRate)}</td><td>{test.secondModuleClickRate==null?"—":percent.format(test.secondModuleClickRate)}</td><td>{test.openRate==null?"—":percent.format(test.openRate)}</td><td>{test.hasData?number.format(test.delivered):"—"}</td>
    </tr>}))}/>
   </table></div></MetricSortScope></TestReadout>
  </article>)}
 </section>;
}
