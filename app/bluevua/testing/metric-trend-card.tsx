'use client';

import {Suspense,use,useState} from 'react';
import {useReducedMotion} from 'motion/react';
import {CartesianGrid,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {Button} from '@/components/base/buttons/button';
import {cx} from '@/utils/cx';
import type {OverviewTrendMetric,OverviewTrends,OverviewTrendPoint} from '@/lib/overview-daily-metrics';
import type {GaugeSegment} from './segmented-gauge';
export type MetricTrendSegment=GaugeSegment&{note?:string};

const number=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
const compact=new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1});
const currency=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2});
const percent=new Intl.NumberFormat('en-US',{style:'percent',maximumFractionDigits:2});
const dateLabel=(date:string)=>new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
const fullDateLabel=(date:string)=>new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
function formatValue(metric:OverviewTrendMetric,value:number|null|undefined){
 if(value==null)return '—';
 if(metric==='revenue')return currency.format(value);
 if(metric==='ctr'||metric==='cvr')return percent.format(value);
 if(metric==='roas')return `${number.format(value)}×`;
 return number.format(value);
}
function DailyTooltip({active,payload,label,segments,metric,highlight}:{active?:boolean;payload?:ReadonlyArray<{payload?:OverviewTrendPoint}>;label?:string|number;segments:MetricTrendSegment[];metric:OverviewTrendMetric;highlight:string|null}){
 const row=payload?.[0]?.payload;
 if(!active||!row)return null;
 return <div className="min-w-44 rounded-xl border border-border-button-default bg-background-primary-default p-3 shadow-card">
  <p className="mb-2 text-caption-1-semibold text-text-primary">{fullDateLabel(String(label??row.date))}</p>
  <div className="flex flex-col gap-2">{segments.map(segment=><div key={segment.label} className={cx('flex items-center justify-between gap-6 text-caption-1-regular',highlight&&highlight!==segment.label?'opacity-40':'text-text-secondary')}><span className="flex items-center gap-2"><span className={cx('size-2 rounded-full',segment.dot)}/>{segment.label}{segment.note?` (${segment.note})`:""}</span><span className="text-caption-1-semibold tabular-nums text-text-primary">{formatValue(metric,row[segment.label as keyof Omit<OverviewTrendPoint,'date'>])}</span></div>)}</div>
 </div>;
}
function DailyChart({trends,metric,segments,highlight,title}:{trends:Promise<OverviewTrends>;metric:OverviewTrendMetric;segments:MetricTrendSegment[];highlight:string|null;title:string}){
 const {metrics,issues}=use(trends);
 const reduceMotion=useReducedMotion();
 const rows=metrics[metric];
 const hasData=rows.some(row=>segments.some(segment=>typeof row[segment.label as keyof Omit<OverviewTrendPoint,'date'>]==='number'));
 return <>
  <div className="relative mt-4 h-44 min-w-0" aria-label={`${title}, daily trend. Use left and right arrow keys on the chart to inspect dates.`}>
   <ResponsiveContainer width="100%" height="100%" minWidth={0}>
    <LineChart data={rows} accessibilityLayer margin={{top:8,right:8,left:0,bottom:0}}>
     <CartesianGrid vertical={false} stroke="var(--color-separator-border)" strokeDasharray="3 5"/>
     <XAxis dataKey="date" axisLine={false} tickLine={false} tickFormatter={dateLabel} minTickGap={32} tickMargin={10} tick={{fill:'var(--color-text-tertiary)'}} className="text-caption-2-regular"/>
     <YAxis width={52} axisLine={false} tickLine={false} tickCount={3} allowDecimals={metric!=='assets'} tickFormatter={value=>metric==='ctr'||metric==='cvr'?percent.format(value):metric==='roas'?`${compact.format(value)}×`:metric==='revenue'?`$${compact.format(value)}`:compact.format(value)} tick={{fill:'var(--color-text-tertiary)'}} className="text-caption-2-regular"/>
     <Tooltip filterNull={false} cursor={{stroke:'var(--color-border-button-hover)',strokeDasharray:'4 4'}} content={<DailyTooltip segments={segments} metric={metric} highlight={highlight}/>} wrapperStyle={{zIndex:20}}/>
     {segments.map(segment=><Line key={segment.label} dataKey={segment.label} name={segment.label} type="linear" stroke={`var(--color-${segment.dot.replace('bg-','')})`} strokeWidth={highlight===segment.label?3:2} strokeOpacity={highlight&&highlight!==segment.label?0.16:1} dot={{r:2,strokeWidth:0,fill:`var(--color-${segment.dot.replace('bg-','')})`}} activeDot={{r:4,fill:`var(--color-${segment.dot.replace('bg-','')})`,stroke:'var(--color-background-primary-default)',strokeWidth:2}} connectNulls={false} isAnimationActive={!reduceMotion} animationDuration={450}/>)}
    </LineChart>
   </ResponsiveContainer>
   {!hasData&&<div className="pointer-events-none absolute inset-0 flex items-center justify-center"><p className="rounded-lg bg-background-primary-default px-3 py-2 text-caption-1-regular text-text-tertiary">Daily data unavailable</p></div>}
  </div>
  {issues.length>0&&<p className="mt-1 text-caption-2-regular text-text-tertiary">{issues.join(' · ')}</p>}
 </>;
}
export function MetricTrendCard({title,value,caption,segments,children,className,metric,trends,detailsBeforeChannels=false}:{title:string;value:string;caption:string;segments:MetricTrendSegment[];children?:React.ReactNode;detailsBeforeChannels?:boolean;className?:string;metric:OverviewTrendMetric;trends:Promise<OverviewTrends>}){
 const [hovered,setHovered]=useState<string|null>(null);
 const [selected,setSelected]=useState<string|null>(null);
 const highlight=hovered??selected;
 const distributionTotal=segments.reduce((sum,segment)=>sum+Math.max(0,segment.value),0);
 const showDistribution=metric!=='roas'&&metric!=='cvr'&&metric!=='ctr';
 const activeSegment=segments.find(segment=>segment.label===highlight)??segments.find(segment=>segment.value>0)??segments[0];
 const share=distributionTotal>0?(activeSegment?.value??0)/distributionTotal:0;
 return <article className={cx('min-w-0 rounded-3xl border border-border-button-default bg-background-primary-default p-4 shadow-card',className)}>
  <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="text-body-2-regular text-text-secondary">{title}</h3><p className="mt-0.5 text-title-2-medium tabular-nums text-text-primary">{value}</p></div>{showDistribution&&<div className="shrink-0 text-right"><p className="text-title-1-medium tabular-nums text-text-primary">{new Intl.NumberFormat('en-US',{style:'percent',maximumFractionDigits:0}).format(share)}</p><p className="text-caption-2-regular text-text-tertiary">{activeSegment?.label}</p></div>}</div>
  {showDistribution&&<div className="mt-2 flex h-6 items-center gap-1" role="group" aria-label={`${title} selected-period distribution`} onMouseLeave={()=>setHovered(null)}>{distributionTotal>0?segments.filter(segment=>segment.value>0).map(segment=><Button key={segment.label} variant="ghost" size="small" aria-label={`${segment.label}: ${segment.display}, ${Math.round(segment.value/distributionTotal*100)}% of ${caption}`} onMouseEnter={()=>setHovered(segment.label)} onFocus={()=>setHovered(segment.label)} onBlur={()=>setHovered(null)} onClick={()=>setSelected(current=>current===segment.label?null:segment.label)} style={{flexGrow:Math.max(segment.value/distributionTotal*100,2)}} className={cx('h-6 min-w-0 basis-0 rounded-full bg-background-primary-default p-0 hover:bg-background-primary-default active:bg-background-primary-default [&>span]:w-full [&>span]:px-0 transition-opacity motion-reduce:transition-none',highlight&&highlight!==segment.label&&'opacity-30')}><span className={cx('h-2 w-full rounded-full',segment.dot)}/></Button>):<span className="h-2 w-full rounded-full bg-background-tertiary-default"/>}</div>}

  {detailsBeforeChannels&&children}
  <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1" aria-label={`${title} channel highlights`} onMouseLeave={()=>setHovered(null)}>{segments.map(segment=><Button key={segment.label} variant="ghost" size="small" aria-pressed={selected===segment.label} aria-label={`Highlight ${segment.label} in ${title}`} onMouseEnter={()=>setHovered(segment.label)} onFocus={()=>setHovered(segment.label)} onBlur={()=>setHovered(null)} onClick={()=>setSelected(current=>current===segment.label?null:segment.label)} className={cx('h-8 w-auto justify-start rounded-md bg-background-primary-default px-1 text-caption-1-regular text-text-secondary hover:bg-background-primary-default hover:text-text-primary active:bg-background-primary-default [&>span]:gap-1.5 [&>span]:px-0 transition-opacity motion-reduce:transition-none',highlight&&highlight!==segment.label&&'opacity-40')}><span className={cx('size-2 shrink-0 rounded-full',segment.dot)}/><span className="truncate">{segment.label}</span>{segment.note&&<span className="text-caption-2-regular text-text-tertiary">({segment.note})</span>}<span className="text-caption-1-regular tabular-nums text-text-primary">{segment.display}</span></Button>)}</div>
  {!detailsBeforeChannels&&children}
  <Suspense fallback={<div className="mt-4 flex h-44 items-center justify-center rounded-xl bg-background-secondary-default text-caption-1-regular text-text-tertiary" role="status">Loading daily trend…</div>}><DailyChart trends={trends} metric={metric} segments={segments} highlight={highlight} title={title}/></Suspense>
 </article>;
}
