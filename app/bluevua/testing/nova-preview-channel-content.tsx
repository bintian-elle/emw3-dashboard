'use client';

import {useMemo,useState,type ReactNode} from 'react';
import {getCoreRowModel,getSortedRowModel,useReactTable,type ColumnDef,type SortingState} from '@tanstack/react-table';
import {ArrowUpDown,ArrowUpRight} from 'lucide-react';
import Link from './testing-link';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import type {ChannelPerformanceRow} from '@/lib/channel-performance-data';
import type {EdmSpecialMetrics,SocialSpecialMetrics} from '@/lib/channel-special-performance-data';
import {TestingChannelBrand} from './testing-channel-brand';
import {NovaButton,NovaCard,NovaTable,NovaTableHeader,NovaTableBody,NovaTableRow,NovaTableHead,NovaTableCell} from './nova-preview-ui';
import styles from './nova-preview-sections.module.css';
import channelStyles from './nova-preview-channel-performance.module.css';

const dollars=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const count=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
const percent=new Intl.NumberFormat('en-US',{style:'percent',minimumFractionDigits:2,maximumFractionDigits:2});
const show=(value:number|null,formatter:Intl.NumberFormat)=>value==null||!Number.isFinite(value)?'—':formatter.format(value);

function SpecialTable({name,href,anchors=[],status,items,ariaLabel,channelLabel}:{name:string;href:string;anchors?:string[];status?:string;items:{label:string;value:string}[];ariaLabel:string;channelLabel:string}){
 return <NovaTable aria-label={ariaLabel}>
  <NovaTableHeader><NovaTableRow><NovaTableHead scope="col">{channelLabel}</NovaTableHead>{items.map(item=><NovaTableHead scope="col" className={channelStyles.number} key={item.label}>{item.label}</NovaTableHead>)}</NovaTableRow></NovaTableHeader>
  <NovaTableBody><NovaTableRow><NovaTableCell><span className={styles.anchorContainer}>{anchors.map(anchor=><span key={anchor} id={anchor} className={styles.anchor} aria-hidden="true"/>)}<span className={channelStyles.specialIdentity}><Link href={href} className={styles.channelLink}><TestingChannelBrand name={name}/>{name}<ArrowUpRight aria-hidden="true"/></Link>{status&&<span className={channelStyles.scope}>{status}</span>}</span></span></NovaTableCell>{items.map(item=><NovaTableCell className={channelStyles.number} key={item.label}>{item.value}</NovaTableCell>)}</NovaTableRow></NovaTableBody>
 </NovaTable>;
}
export function NovaSocialSummary({metrics,stale=false}:{metrics:SocialSpecialMetrics;stale?:boolean}){
 const {language}=useSiteLanguage(),zh=language==='zh';
 const items=[{label:'Views',value:show(metrics.views,count)},{label:'Likes',value:show(metrics.likes,count)},{label:'Comments',value:show(metrics.comments,count)},{label:'Shares',value:show(metrics.shares,count)},{label:'Saves',value:show(metrics.saved,count)}];
 return <SpecialTable name="Social Media" href="/bluevua/testing/social" status={stale?(zh?'缓存数据':'Cached'):undefined} items={items} ariaLabel={zh?'Social Media 表现':'Social Media performance'} channelLabel={zh?'渠道':'Channel'}/>;
}
const channelOrder=['google-search','google-pmax','google-demand-gen','meta','reddit'];
export function NovaChannelContent({rows,email,emailMetrics,social}:{rows:ChannelPerformanceRow[];email:ChannelPerformanceRow;emailMetrics:EdmSpecialMetrics;social:ReactNode}){
 const {language}=useSiteLanguage(),zh=language==='zh';
 const [sorting,setSorting]=useState<SortingState>([]);
 const columns=useMemo<ColumnDef<ChannelPerformanceRow>[]>(()=>[
  {id:'name',accessorFn:row=>row.name,header:zh?'渠道':'Channel',enableSorting:false},
  ...([
   ['spend','Spend'],['revenue','Revenue'],['orders','Orders'],['reach','Reach'],['ctr','CTR'],['roas','ROAS'],
  ] as const).map(([key,label])=>({id:key,accessorFn:(row:ChannelPerformanceRow)=>{const value=row[key];return value!=null&&Number.isFinite(value)?value:undefined;},header:label,sortDescFirst:true,sortUndefined:'last' as const})),
 ],[zh]);
 const orderedRows=useMemo(()=>[...rows].sort((a,b)=>{const ai=channelOrder.indexOf(a.key),bi=channelOrder.indexOf(b.key);return (ai<0?channelOrder.length:ai)-(bi<0?channelOrder.length:bi);}),[rows]);
 const table=useReactTable({data:orderedRows,columns,state:{sorting},onSortingChange:setSorting,getCoreRowModel:getCoreRowModel(),getSortedRowModel:getSortedRowModel()});
 const items=[{label:'Delivered',value:show(emailMetrics.delivered,count)},{label:'Open rate',value:show(emailMetrics.openRate,percent)},{label:'Email click rate',value:show(emailMetrics.clickRate,percent)},{label:'Orders',value:show(emailMetrics.orders,count)},{label:'Revenue',value:show(emailMetrics.revenue,dollars)}];
 return <section aria-labelledby="channel-performance" className={styles.channelSection}>
  <NovaCard className={channelStyles.card}>
   <div className={channelStyles.header}><h2 id="channel-performance">{zh?'渠道表现':'Channel Performance'}</h2></div>
   <NovaTable aria-label={zh?'广告渠道表现':'Advertising channel performance'}><NovaTableHeader>{table.getHeaderGroups().map(group=><NovaTableRow key={group.id}>{group.headers.map(header=>{
    const direction=header.column.getIsSorted();
    return <NovaTableHead key={header.id} scope="col" aria-sort={direction==='asc'?'ascending':direction==='desc'?'descending':undefined} className={header.id==='name'?undefined:channelStyles.number}>{header.column.getCanSort()?<NovaButton type="button" variant="ghost" size="sm" className={[channelStyles.sortButton,channelStyles.sortNumber].join(' ')} onClick={header.column.getToggleSortingHandler()}>{header.column.columnDef.header as string}<ArrowUpDown aria-hidden="true"/></NovaButton>:header.column.columnDef.header as string}</NovaTableHead>;
   })}</NovaTableRow>)}</NovaTableHeader><NovaTableBody>{table.getRowModel().rows.map(({original:row})=><NovaTableRow key={row.key}><NovaTableCell><span className={styles.anchorContainer}>{row.anchors.map(anchor=><span key={anchor} id={anchor} className={styles.anchor} aria-hidden="true"/>)}<Link href={row.href} className={styles.channelLink}><TestingChannelBrand name={row.name}/>{row.name}<ArrowUpRight aria-hidden="true"/></Link></span></NovaTableCell><NovaTableCell className={channelStyles.number}>{show(row.spend,dollars)}</NovaTableCell><NovaTableCell className={channelStyles.number}>{show(row.revenue,dollars)}</NovaTableCell><NovaTableCell className={channelStyles.number}>{show(row.orders,count)}</NovaTableCell><NovaTableCell className={channelStyles.number}>{show(row.reach,count)}</NovaTableCell><NovaTableCell className={channelStyles.number}>{show(row.ctr,percent)}</NovaTableCell><NovaTableCell className={channelStyles.number}>{row.roas==null||!Number.isFinite(row.roas)?'—':`${row.roas.toFixed(2)}×`}</NovaTableCell></NovaTableRow>)}</NovaTableBody></NovaTable>
   <SpecialTable name="EDM" href={email.href} anchors={email.anchors} items={items} ariaLabel={zh?'EDM 表现':'EDM performance'} channelLabel={zh?'渠道':'Channel'}/>{social}
  </NovaCard>
 </section>;
}
