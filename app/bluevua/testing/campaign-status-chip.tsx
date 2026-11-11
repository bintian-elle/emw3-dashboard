'use client';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {testingCampaignStatus} from '@/lib/testing-campaign-status';
import styles from './inventory/inventory.module.css';

export function CampaignStatusChip({status}:{status:string}){
 const {language}=useSiteLanguage();
 const {tone,label}=testingCampaignStatus(status,language==='zh');
 return <span className={styles.statusBadge} data-tone={tone}>{label}</span>;
}
