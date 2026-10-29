'use client';

import {Suspense,useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {ArrowUpRight,LoaderCircle,Search} from 'lucide-react';
import type {TestingInventoryItem} from '@/lib/testing-inventory-model';
import {configuredTestingCampaignCount} from '@/lib/testing-campaign-counts';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {TestingChannelBrand} from '../testing-channel-brand';
import TestingLink from '../testing-link';
import {TestingWorkspaceTabs} from '../testing-workspace-tabs';
import {useTestingInventory} from '../testing-inventory-context';
import {NovaButton,NovaCard,NovaInput} from '../nova-preview-ui';
import styles from './inventory.module.css';

const names:Record<string,string>={'google-search':'Google Search','google-pmax':'Google PMAX','google-demand-gen':'Google Demand Gen',meta:'Meta',reddit:'Reddit',edm:'EDM'};
function statusLabel(status:string,zh:boolean){
 const normalized=status.trim().toUpperCase();
 if(['ACTIVE','ENABLED','SERVING'].includes(normalized))return zh?'投放中':'Active';
 if(['PAUSED','CAMPAIGN_PAUSED'].includes(normalized))return zh?'已暂停':'Paused';
 if(['SENT','COMPLETED'].includes(normalized))return zh?'已发送':'Sent';
 if(['ENDED','REMOVED','ARCHIVED'].includes(normalized))return zh?'已结束':'Ended';
 if(normalized==='CONCLUDED')return zh?'已结束':'Concluded';
 if(normalized==='UNKNOWN')return zh?'状态未知':'Unknown';
 return status;
}

function statusTone(status:string){
 const normalized=status.trim().toUpperCase();
 if(['ACTIVE','ENABLED','SERVING'].includes(normalized))return 'active';
 if(['PAUSED','CAMPAIGN_PAUSED'].includes(normalized))return 'paused';
 if(['SENT','COMPLETED'].includes(normalized))return 'sent';
 if(['ENDED','REMOVED','ARCHIVED','CONCLUDED'].includes(normalized))return 'ended';
 return 'unknown';
}

function InventoryRows({search,zh,onReset}:{search:string;zh:boolean;onReset:()=>void}){
 const inventory=useTestingInventory();
 const params=useSearchParams();
 const items=useMemo(()=>{const query=search.trim().toLocaleLowerCase();return inventory.items.filter(item=>`${item.channel} ${item.name}`.toLocaleLowerCase().includes(query));},[inventory.items,search]);
 const href=(item:TestingInventoryItem)=>{const url=new URL(item.href,'https://testing.local');for(const key of ['period','start','end']){const value=params.get(key);if(value)url.searchParams.set(key,value);}return `${url.pathname}${url.search}`;};
 return <>
   {inventory.unavailable.length>0&&<p className={styles.unavailable} role="status">{zh?'以下渠道的数据暂不可用：':'Data is temporarily unavailable for: '}{inventory.unavailable.map(channel=>names[channel]).join('、')}</p>}
   <div className={styles.list}>{items.map(item=><NovaButton key={item.id} variant="ghost" asChild className={styles.item}><TestingLink href={href(item)} prefetch={false}><span className={styles.symbol}><TestingChannelBrand name={item.channel}/></span><span className={styles.identity}><strong>{item.name}</strong><span>{item.channel} <span className={styles.separator}>/</span> <span className={styles.statusBadge} data-tone={statusTone(item.status)}><span className={styles.statusDot} aria-hidden="true"/>{statusLabel(item.status,zh)}</span></span></span><ArrowUpRight aria-hidden="true"/></TestingLink></NovaButton>)}</div>
   {!items.length&&(search||!inventory.unavailable.length)&&<div className={styles.empty}><strong>{search?(zh?'没有匹配的 Campaign':'No matching campaigns'):(zh?'暂无 Campaign':'No campaigns available')}</strong>{search&&<><p>{zh?'请清除搜索后重试。':'Clear the search and try again.'}</p><NovaButton variant="outline" onClick={onReset}>{zh?'清除搜索':'Reset filters'}</NovaButton></>}</div>}
 </>;
}

export function InventoryPage({loading=false}:{loading?:boolean}){
 const {language}=useSiteLanguage(),zh=language==='zh';
 const [search,setSearch]=useState('');
 const loadingIndicator=<p className={styles.loading} role="status"><LoaderCircle aria-hidden="true"/>{zh?'正在加载数据…':'Loading data…'}</p>;
 return <div className={styles.page}>
  <TestingWorkspaceTabs active="inventory" count={configuredTestingCampaignCount()}/>
  <NovaCard className={styles.card}>
   <div className={styles.toolbar}><div><h2>{zh?'已配置的测试清单':'Configured test inventory'}</h2><p>{zh?'按 Campaign 单独计数，不包含广告和素材组。':'Campaigns are counted separately from ads and asset groups.'}</p></div>
    <div className={styles.search}><Search aria-hidden="true"/><NovaInput type="search" aria-label={zh?'搜索测试清单':'Search inventory'} placeholder={zh?'搜索 Campaign…':'Search campaigns...'} value={search} onChange={event=>setSearch(event.target.value)}/></div>
   </div>
   {loading?loadingIndicator:<Suspense fallback={loadingIndicator}><InventoryRows search={search} zh={zh} onReset={()=>setSearch('')}/></Suspense>}
  </NovaCard>
 </div>;
}

/** Used while the destination route is loading so its controls stay visible. */
export function InventorySkeleton(){return <InventoryPage loading/>;}
