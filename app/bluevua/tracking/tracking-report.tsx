'use client';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@/components/base/table/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { TrackingReport } from '@/lib/website-tracking';
export function TrackingReportTable({id,title,description,columns,report,currency,scopeLabel,embedded=false,emptyMessage='No matching activity for this period and device. Try a wider date range.'}:{id:string;title:string;description?:string;columns:string[];report:TrackingReport;currency?:string;scopeLabel?:string;embedded?:boolean;emptyMessage?:string}){
 const content=<>
 {report.error?<p role="status" className="rounded-xl bg-background-secondary-default p-4 text-body-regular text-text-secondary">{report.error}</p>:report.rows.length?<Table aria-label={title}><TableHeader>{columns.map((column,index)=><TableColumn key={column} isRowHeader={index===0}>{column}</TableColumn>)}</TableHeader><TableBody>{report.rows.map((row,index)=><TableRow key={index} id={`${id}-${index}`}>{[...row.dimensions,...row.metrics.map((metric,metricIndex)=>currency&&metricIndex===row.metrics.length-1?new Intl.NumberFormat('en-US',{style:'currency',currency}).format(metric):metric.toLocaleString('en-US'))].map((value,cell)=><TableCell key={cell}>{value||'Not set'}</TableCell>)}</TableRow>)}</TableBody></Table>:<p className="py-6 text-body-regular text-text-secondary">{emptyMessage}</p>}
 {report.warnings.map(warning=><p key={warning} role="status" className="mt-3 text-caption-1-regular text-text-secondary">{warning}</p>)}
 </>;
 if(embedded)return <div id={id}>{content}</div>;
 return <Card id={id} className="scroll-mt-6 rounded-3xl"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{title}</CardTitle>{scopeLabel&&<span className="rounded-full bg-background-secondary-default px-3 py-1 text-caption-1-medium text-text-secondary">{scopeLabel}</span>}</div>{description&&<CardDescription>{description}</CardDescription>}</CardHeader><CardContent className="mt-5">{content}</CardContent></Card>;
}
