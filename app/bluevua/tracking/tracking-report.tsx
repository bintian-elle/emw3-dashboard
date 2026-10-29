'use client';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@/components/base/table/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { TrackingReport } from '@/lib/website-tracking';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
export function TrackingReportTable({id,title,description,columns,report,currency,scopeLabel,embedded=false,emptyMessage='No matching activity for this period and device. Try a wider date range.'}:{id:string;title:string;description?:string;columns:string[];report:TrackingReport;currency?:string;scopeLabel?:string;embedded?:boolean;emptyMessage?:string}){
 const {language}=useSiteLanguage(),zh=language==='zh';
 const titles:Record<string,string>={'Feature action details':'功能操作详情','Product recommendation details':'产品推荐详情','Purchase source details':'购买来源详情'};
 const emptyMessages:Record<string,string>={'No matching activity for this period and device. Try a wider date range.':'此周期和设备没有匹配的数据，请尝试扩大日期范围。','No purchase-source records for this period and device.':'此周期和设备没有购买来源记录。'};
 const displayTitle=zh?(titles[title]??title):title;
 const content=<>
 {report.error?<p role="status" className="rounded-lg border border-border-button-default bg-background-secondary-default p-4 text-[13px] text-text-secondary">{report.error}</p>:report.rows.length?<Table aria-label={displayTitle}><TableHeader>{columns.map((column,index)=><TableColumn key={column} isRowHeader={index===0}>{column}</TableColumn>)}</TableHeader><TableBody>{report.rows.map((row,index)=><TableRow key={index} id={`${id}-${index}`}>{[...row.dimensions,...row.metrics.map((metric,metricIndex)=>currency&&metricIndex===row.metrics.length-1?new Intl.NumberFormat('en-US',{style:'currency',currency}).format(metric):metric.toLocaleString('en-US'))].map((value,cell)=><TableCell key={cell}>{value||(zh?'未设置':'Not set')}</TableCell>)}</TableRow>)}</TableBody></Table>:<p className="py-6 text-[13px] text-text-secondary">{zh?(emptyMessages[emptyMessage]??emptyMessage):emptyMessage}</p>}
 {report.warnings.map(warning=><p key={warning} role="status" className="mt-3 text-caption-1-regular text-text-secondary">{warning}</p>)}
 </>;
 if(embedded)return <div id={id}>{content}</div>;
 return <Card id={id} className="scroll-mt-6 rounded-[10px]"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{displayTitle}</CardTitle>{scopeLabel&&<span className="rounded-full bg-background-secondary-default px-3 py-1 text-caption-1-medium text-text-secondary">{scopeLabel}</span>}</div>{description&&<CardDescription>{description}</CardDescription>}</CardHeader><CardContent className="mt-5">{content}</CardContent></Card>;
}
