'use client';

import {useMemo,useState,type ReactNode} from 'react';
import {ArrowDown,ArrowUp,ArrowUpDown} from 'lucide-react';
import {flexRender,getCoreRowModel,getSortedRowModel,useReactTable,type ColumnDef,type SortingState} from '@tanstack/react-table';
import type {ExpandedTestingData,ExpandedTestRow} from '@/lib/google-expanded-content-testing';
import type {GoogleAdMetrics} from '@/lib/google-ad-performance';
import {orderTestingMetrics} from '@/lib/testing-metric-order';
import {testingCampaignAnchor,withTestingReturnTo} from '@/lib/testing-navigation';
import TestingLink from './testing-link';
import {TestingChannelBrand} from './testing-channel-brand';
import {TestReadout} from './test-readout';
import {NovaButton,NovaCard,NovaTable,NovaTableBody,NovaTableCell,NovaTableHead,NovaTableHeader,NovaTableRow} from './nova-preview-ui';
import styles from './nova-google-expanded.module.css';

const columns=orderTestingMetrics([{key:'spend',label:'Spend'},{key:'revenue',label:'Revenue'},{key:'roas',label:'ROAS'},{key:'orders',label:'#Purchase'},{key:'cvr',label:'CVR'},{key:'ctr',label:'CTR'},{key:'cpa',label:'CPA'},{key:'cpc',label:'CPC'}]);
function format(row:GoogleAdMetrics,key:string){const value=row[key as keyof GoogleAdMetrics];if(value==null)return '—';if(['ctr','cvr'].includes(key))return new Intl.NumberFormat('en-US',{style:'percent',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);if(key==='roas')return value.toFixed(2);return new Intl.NumberFormat('en-US',{...(!['orders'].includes(key)?{style:'currency',currency:'USD'}:{}),maximumFractionDigits:2}).format(value);}
const date=(value:string)=>new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`));

export function NovaExpandedGate({data,returnTo}:{children:ReactNode;data:ExpandedTestingData;returnTo?:string}){
 return <NovaExpanded data={data} returnTo={returnTo}/>;
}

function NovaRows({rows,data,parent,periodQuery}:{rows:ExpandedTestRow[];data:ExpandedTestingData;parent:string;periodQuery:string}){
 const [sorting,setSorting]=useState<SortingState>([]),pmax=data.channel==='pmax';
 const defs=useMemo<ColumnDef<ExpandedTestRow>[]>(()=>[
  {id:'name',header:pmax?'Asset group':'Ad',enableSorting:false,cell:({row})=><div className={styles.assetName}><TestingLink prefetch={false} href={withTestingReturnTo(`/bluevua/testing/google/${data.channel}/${row.original.id}${periodQuery}`,parent)}>{row.original.name}</TestingLink><span className={styles.status} data-enabled={row.original.status==='ENABLED'}>{row.original.status}</span></div>},
  ...columns.map(column=>({id:column.key,accessorFn:(row:ExpandedTestRow)=>row.metrics[column.key as keyof GoogleAdMetrics]??undefined,header:column.label,sortUndefined:'last' as const,cell:({row}:{row:{original:ExpandedTestRow}})=>format(row.original.metrics,column.key)})),
 ],[data.channel,parent,periodQuery,pmax]);
 const table=useReactTable({data:rows,columns:defs,state:{sorting},onSortingChange:setSorting,getCoreRowModel:getCoreRowModel(),getSortedRowModel:getSortedRowModel(),enableSortingRemoval:true});
 return <NovaTable aria-label={pmax?'Asset group performance':'Ad performance'}><NovaTableHeader>{table.getHeaderGroups().map(group=><NovaTableRow key={group.id}>{group.headers.map((header,index)=>{const direction=header.column.getIsSorted(),Icon=direction==='asc'?ArrowUp:direction==='desc'?ArrowDown:ArrowUpDown;return <NovaTableHead key={header.id} scope="col" aria-sort={direction==='asc'?'ascending':direction==='desc'?'descending':'none'} className={index?styles.numeric:undefined}>{header.column.getCanSort()?<NovaButton variant="ghost" size="sm" onClick={header.column.getToggleSortingHandler()} aria-label={`${header.column.columnDef.header}: sort`} className={styles.sort}>{flexRender(header.column.columnDef.header,header.getContext())}<Icon aria-hidden="true"/></NovaButton>:flexRender(header.column.columnDef.header,header.getContext())}</NovaTableHead>;})}</NovaTableRow>)}</NovaTableHeader><NovaTableBody>{table.getRowModel().rows.map(row=><NovaTableRow key={row.id}>{row.getVisibleCells().map((cell,index)=><NovaTableCell key={cell.id} className={index?styles.numeric:undefined}>{flexRender(cell.column.columnDef.cell,cell.getContext())}</NovaTableCell>)}</NovaTableRow>)}</NovaTableBody></NovaTable>;
}

function NovaExpanded({data,returnTo}:{data:ExpandedTestingData;returnTo?:string}){
 const pmax=data.channel==='pmax',parent=returnTo??`/bluevua/testing/google/${data.channel}`;
 const parentParams=new URL(parent,'https://dashboard.local').searchParams,periodParams=new URLSearchParams();
 for(const key of ['period','start','end']){const value=parentParams.get(key);if(value)periodParams.set(key,value);}
 const periodQuery=periodParams.size?`?${periodParams}`:'';
 return <div className={styles.campaigns}>{data.campaigns.map(campaign=><NovaCard key={campaign.id} className={styles.campaign} id={testingCampaignAnchor(`google-${data.channel}`,campaign.name)}>
  <header className={styles.campaignHeader}><div className={styles.campaignIdentity}><span className={styles.brand}><TestingChannelBrand name={pmax?'Google PMAX':'Google Demand Gen'}/></span><div><div className={styles.eyebrow}>GOOGLE · {pmax?'PMAX':'DEMAND GEN'} <span className={styles.status} data-enabled={campaign.status==='ENABLED'}>{campaign.status}</span></div><h2>{campaign.name}</h2></div></div><span className={styles.period}>{data.periodLabel} · {date(data.period.start)} – {date(data.period.end)}</span></header>
  <TestReadout channel={pmax?'google-pmax':'google-demand-gen'} testIdentity={campaign.name} period={{label:data.periodLabel,...data.period}}>{(pmax?[{id:campaign.id,name:campaign.name,rows:campaign.groups.flatMap(group=>group.rows)}]:campaign.groups).map(group=><div key={group.id}>{!pmax&&<h3 className={styles.groupName}>Ad group · {group.name}</h3>}<NovaRows rows={group.rows} data={data} parent={parent} periodQuery={periodQuery}/></div>)}</TestReadout>
 </NovaCard>)}{!data.campaigns.length&&<NovaCard className={styles.empty}>No matching content testing assets are available.</NovaCard>}</div>;
}
