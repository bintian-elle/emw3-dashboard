'use client';

import {useSearchParams} from 'next/navigation';
import {FlaskConical,LayoutDashboard} from 'lucide-react';
import {Suspense} from 'react';
import {testingInventoryCount} from '@/lib/testing-inventory-model';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {useTestingInventory} from './testing-inventory-context';
import TestingLink from './testing-link';
import styles from './inventory/inventory.module.css';

function InventoryTabCount(){const count=testingInventoryCount(useTestingInventory());return <span>{count??'—'}</span>;}
export function TestingWorkspaceTabs({active}:{active:'overview'|'inventory'}){
 const params=useSearchParams();
 const {language}=useSiteLanguage();
 const query=new URLSearchParams();
 for(const key of ['period','start','end','history']){const value=params.get(key);if(value)query.set(key,value);}
 const suffix=query.size?`?${query}`:'';
 return <nav className={styles.tabs} aria-label={language==='zh'?'测试页面':'Testing views'}>
  <TestingLink href={`/bluevua/testing${suffix}`} aria-current={active==='overview'?'page':undefined}><LayoutDashboard aria-hidden="true"/>{language==='zh'?'总览':'Overview'}</TestingLink>
  <TestingLink href={`/bluevua/testing/inventory${suffix}`} aria-current={active==='inventory'?'page':undefined}><FlaskConical aria-hidden="true"/>{language==='zh'?'测试清单':'Test inventory'} <Suspense fallback={<span>—</span>}><InventoryTabCount/></Suspense></TestingLink>
 </nav>;
}
