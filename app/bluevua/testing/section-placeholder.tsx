import {ArrowRight,type LucideIcon} from "lucide-react";
import {TestingPageHeader} from "./testing-page-header";
import styles from "./channel-content.module.css";

export function TestingSectionPlaceholder({eyebrow,title,description,icon:Icon,items}:{eyebrow:string;title:string;description:string;icon:LucideIcon;items:string[]}){
 return <><TestingPageHeader section={eyebrow} title={title} showReportingPeriod={false}/><p className={styles.muted}>{description}</p><section className={`${styles.card} ${styles.placeholder}`}><div className={styles.placeholderHeading}><Icon aria-hidden="true"/><span className={styles.eyebrow}>PLANNED VIEW</span></div><div className={styles.placeholderGrid}>{items.map(item=><div key={item} className={styles.placeholderItem}><span>{item}</span><ArrowRight aria-hidden="true"/></div>)}</div><p className={styles.muted}>This section is ready for the next data and workflow phase.</p></section></>;
}
