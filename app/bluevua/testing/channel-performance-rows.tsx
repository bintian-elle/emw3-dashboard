'use client';

import {RiArrowRightLine} from '@remixicon/react';
import {ButtonLink} from '@/components/base/buttons/button';
import {Table,TableHeader,TableColumn,TableBody,TableRow,TableCell} from '@/components/base/table/table';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import type {ChannelPerformanceRow} from '@/lib/channel-performance-data';

const dollars=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const numbers=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
const percent=new Intl.NumberFormat('en-US',{style:'percent',minimumFractionDigits:2,maximumFractionDigits:2});
const show=(value:number|null,format:(value:number)=>string)=>value==null||!Number.isFinite(value)?'—':format(value);

export function ChannelPerformanceHeading(){
 const {language}=useSiteLanguage();
 return <h2 id="channel-performance" className="text-title-2-semibold text-text-primary">{language==='zh'?'渠道表现':'Channel Performance'}</h2>;
}
export function ChannelPerformanceRows({rows}:{rows:ChannelPerformanceRow[]}){
 const {language}=useSiteLanguage(),zh=language==='zh';
 return <Table aria-label={zh?'广告渠道表现':'Advertising channel performance'} className="min-w-4xl">
  <TableHeader>
   <TableColumn isRowHeader>{zh?'渠道':'Channel'}</TableColumn>
   <TableColumn><span className="block text-right">{zh?'花费':'Spend'}</span></TableColumn>
   <TableColumn><span className="block text-right">{zh?'收入':'Revenue'}</span></TableColumn>
   <TableColumn><span className="block text-right">{zh?'订单':'Orders'}</span></TableColumn>
   <TableColumn><span className="block text-right">{zh?'触达':'Reach'}</span></TableColumn>
   <TableColumn><span className="block text-right">CTR</span></TableColumn>
   <TableColumn><span className="block text-right">ROAS</span></TableColumn>
  </TableHeader>
  <TableBody>{rows.map(row=><TableRow key={row.key} id={row.key}>
   <TableCell className="relative min-w-48">
    {row.anchors.map(anchor=><span key={anchor} id={anchor} className="absolute top-0 scroll-mt-40" aria-hidden/>)}
    <ButtonLink href={row.href} variant="ghost" size="small" trailingIcon={RiArrowRightLine} className="h-auto max-w-full justify-start px-0 py-1 text-body-medium text-status-blue-text">{row.name}</ButtonLink>
   </TableCell>
   <TableCell className="text-right tabular-nums">{show(row.spend,dollars.format)}</TableCell>
   <TableCell className="text-right tabular-nums">{show(row.revenue,dollars.format)}</TableCell>
   <TableCell className="text-right tabular-nums">{show(row.orders,numbers.format)}</TableCell>
   <TableCell className="text-right tabular-nums">{show(row.reach,numbers.format)}</TableCell>
   <TableCell className="text-right tabular-nums">{show(row.ctr,percent.format)}</TableCell>
   <TableCell className="text-right tabular-nums">{show(row.roas,value=>`${value.toFixed(2)}×`)}</TableCell>
  </TableRow>)}</TableBody>
 </Table>;
}
export function ChannelPerformanceLoading(){const {language}=useSiteLanguage();return <p role="status" className="border-t border-separator-border px-4 py-5 text-body-2-regular text-text-secondary sm:px-6">{language==='zh'?'正在加载 Social Media…':'Loading Social Media…'}</p>;}
