'use client';
import {LoaderCircle} from 'lucide-react';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import styles from './channel-content.module.css';

export function TestingDataLoading({compact=false}:{compact?:boolean}) {
 const {language}=useSiteLanguage();
 return <section role="status" aria-live="polite" aria-busy="true" className={`${styles.card} ${compact?styles.loadingCompact:styles.loading}`}><LoaderCircle aria-hidden="true"/><span>{language==='zh'?'正在加载数据…':'Loading data…'}</span></section>;
}
