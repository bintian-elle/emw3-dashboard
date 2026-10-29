'use client';
import { trackingDeviceShares, type TrackingReport } from '@/lib/website-tracking';
import { cx } from '@/utils/cx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { TrackingReportTable } from './tracking-report';
const colors:Record<string,string>={desktop:'bg-chart-1',mobile:'bg-chart-2',tablet:'bg-chart-3'};
const label=(device:string)=>device.charAt(0).toUpperCase()+device.slice(1);
export function DeviceBreakdown({report}:{report:TrackingReport}){
 const rows=[...report.rows].sort((a,b)=>{const rank=(device:string)=>({desktop:0,mobile:1,tablet:2}[device]??3);return rank(a.dimensions[0])-rank(b.dimensions[0]);});
 const shares=trackingDeviceShares(rows);
 const totalEvents=rows.reduce((sum,row)=>sum+(row.metrics[1]??0),0);
 const preview=report.error?<p role="status" className="text-body-regular text-text-secondary">{report.error}</p>:<>
  {totalEvents>0?<div role="img" aria-label={`Event share by device: ${shares.map(row=>`${label(row.device)} ${(row.share*100).toFixed(1)}%`).join(', ')}`} className="flex h-3 overflow-hidden rounded-full bg-background-secondary-default">{shares.map(row=><span key={row.device} className={cx('h-full',colors[row.device]??'bg-chart-4')} style={{width:`${row.share*100}%`}}/>)}</div>:<p className="text-body-regular text-text-secondary">No device events returned for this period.</p>}
  <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">{shares.map(row=><li key={row.device} className="flex items-center gap-2 text-body-regular text-text-secondary"><span aria-hidden className={cx('size-2.5 rounded-full',colors[row.device]??'bg-chart-4')}/><span>{label(row.device)}</span><span className="text-body-medium text-text-primary">{(row.share*100).toFixed(1)}%</span></li>)}</ul>
  {report.warnings.map(warning=><p key={warning} role="status" className="mt-3 text-caption-1-regular text-text-secondary">{warning}</p>)}
 </>;
 return <Card id="device-breakdown" className="scroll-mt-6 rounded-[10px]"><CardHeader><CardTitle>Device Breakdown</CardTitle><CardDescription>Share of production-site events and detailed metrics by device.</CardDescription></CardHeader><CardContent className="mt-5 space-y-5">{preview}
  <TrackingReportTable id="device-metrics" embedded title="Device metrics" columns={['Device','Users','Events','Add to Cart','Purchases']} report={{...report,warnings:[],rows:rows.map(row=>({...row,dimensions:[label(row.dimensions[0])]}))}}/>
  <p className="mt-3 text-caption-1-regular text-text-secondary">Users are deduplicated within each device. Overall Unique Users is queried separately and cannot be calculated by adding these rows.</p>
 </CardContent></Card>;
}
