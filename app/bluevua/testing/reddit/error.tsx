"use client";
import {NovaButton} from "../nova-preview-ui";
import styles from "../channel-content.module.css";
export default function RedditTestingError({reset}:{reset:()=>void}){
 return <section role="alert" className={`${styles.card} ${styles.placeholder}`}><h2 className={styles.title}>Reddit reports could not be loaded</h2><p className={styles.muted}>Reddit may be temporarily unavailable. Please retry before selecting another reporting period.</p><NovaButton variant="outline" className={styles.retry} onClick={reset}>Retry loading reports</NovaButton></section>;
}
