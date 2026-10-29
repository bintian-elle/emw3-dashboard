'use client';

import {useLinkStatus} from 'next/link';
import {createPortal} from 'react-dom';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import styles from './workspace-navigation-status.module.css';

/** Show pending navigation without replacing the current view. */
export function WorkspaceNavigationStatus(){
 const {pending}=useLinkStatus();
 const {language}=useSiteLanguage();
 if(!pending||typeof document==='undefined')return null;
 const main=document.querySelector<HTMLElement>('main[data-testing-content]');
 const rect=main?.getBoundingClientRect();
 return createPortal(<span role="status" aria-live="polite" className={styles.status} style={rect?{left:rect.left+rect.width/2}:undefined}>{language==='zh'?'正在加载数据…':'Loading data…'}</span>,main??document.body);
}
