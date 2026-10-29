import styles from "./channel-content.module.css";

export function CampaignStatusChip({status}:{status:string}){
 const normalized=status.trim().toUpperCase();
 const label=normalized==="CONCLUDED"?"Concluded":
  ["ACTIVE","ENABLED","SERVING"].includes(normalized)?"Active":
  ["PAUSED","CAMPAIGN_PAUSED"].includes(normalized)?"Paused":
  ["SENT","COMPLETED"].includes(normalized)?"Sent":
  ["ENDED","REMOVED","ARCHIVED"].includes(normalized)?"Ended":status;
 return <span className={styles.badge}>{label}</span>;
}
