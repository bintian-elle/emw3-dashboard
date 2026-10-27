'use client';
import type {ComponentAppearance} from '@/lib/ai-dashboard-appearance';
import {cx} from '@/utils/cx';
import type {TextBlock as TextBlockData} from '@/lib/ai-dashboard-text';
import {TextBlock,type TextChange} from './text-block';
import {EditableTitle} from './editable-title';
import {useState} from 'react';
import {Line,LineChart,Bar,BarChart,CartesianGrid,LabelList,Legend,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {Button} from '@/components/base/buttons/button';
import {CHANNEL_NAMES} from '@/lib/ai-dashboard-labels';
import type {Widget,Dataset} from '@/lib/ai-dashboard';
import {ComparisonBadge} from './comparison-badge';
import {ChartColorMenu} from './chart-color-menu';
const names:Record<string,string>={spend:'Spend',revenue:'Attributed revenue',conversions:'Conversions',impressions:'Impressions',clicks:'Clicks',roas:'ROAS',ctr:'CTR',cpc:'CPC',cpa:'CPA',delivered:'Delivered',opens:'Opens',campaignRevenue:'Campaign revenue',flowRevenue:'Flow revenue',sessions:'Sessions',users:'Users',engagementRate:'Engagement rate'};
for(const [key,label]of Object.entries({...names})){names[key+'_pop']=label+' PoP';names[key+'_yoy']=label+' YoY';}
// Verified chart-series colors from the source decks; explicit SVG colors also survive PDF capture.
const metricColors:Record<string,string>={spend:'#4285f4',revenue:'#ff6d01',campaignRevenue:'#ff6d01',flowRevenue:'#ff6d01',roas:'#34a853',conversions:'#ff6d01'};
const defaultColors=['#4285f4','#ff6d01','var(--color-chart-1)','var(--color-chart-5)','var(--color-chart-4)','var(--color-chart-2)'];
function format(value:unknown,metric:string,currency='USD',compact=false){
 if(value===null||value===undefined)return '—';const n=Number(value);if(!Number.isFinite(n))return '—';
 if(/_pop$|_yoy$/.test(metric))return (n>0?'+':'')+n.toFixed(1)+'%';
 if(['spend','revenue','cpc','cpa','campaignRevenue','flowRevenue'].includes(metric))return new Intl.NumberFormat('en-US',{style:'currency',currency,maximumFractionDigits:compact?0:2,...compact?{notation:'compact' as const}:{}}).format(n);
 if(metric==='roas')return n.toFixed(2)+'×';if(['ctr','engagementRate'].includes(metric))return (n*100).toFixed(2)+'%';
 return new Intl.NumberFormat('en-US',{maximumFractionDigits:2,...compact?{notation:'compact' as const}:{}}).format(n);
}
function ChartLegend({metrics,labelFor,colorFor,editing,setEditing,onColorChange,editable}:{editable:boolean;metrics:string[];labelFor:(metric:string)=>string;colorFor:(metric:string)=>string;editing:string|null;setEditing:(metric:string|null)=>void;onColorChange?: (metric:string,color:string|null)=>void}){
 return <div className="mb-3 flex flex-wrap justify-center gap-x-3 gap-y-1">{metrics.map(m=><ChartColorMenu key={m} label={labelFor(m)} color={colorFor(m)} open={editable&&editing===m} disabled={!editable} onOpenChange={open=>setEditing(open?m:null)} onChange={color=>onColorChange?.(m,color)}/>)}</div>;
}
function DataWidgetView({widget,appearance={},colorOverrides={},onColorChange,onTitleChange,editable=true}:{appearance?:ComponentAppearance;onTitleChange?:(title:string)=>void;editable?:boolean;widget:Widget&Dataset;colorOverrides?:Record<string,string>;onColorChange?:(metric:string,color:string|null)=>void}){
 const [expanded,setExpanded]=useState(false),[editing,setEditing]=useState<string|null>(null);const metric=widget.metrics[0];
 const colorFor=(m:string)=>colorOverrides[m]||metricColors[m]||defaultColors[widget.metrics.indexOf(m)%defaultColors.length];
 const labelFor=(m:string)=>widget.source==='ga4'&&m==='revenue'?'Purchase revenue':widget.source==='ga4'&&m==='conversions'?'Purchases':widget.source==='store'&&m==='revenue'?'Revenue':names[m]||m;
 const horizontalLines=appearance.tableLines===undefined||appearance.tableLines==='horizontal'||appearance.tableLines==='both';
 const verticalLines=appearance.tableLines==='vertical'||appearance.tableLines==='both';
 const rowClass=(base?:string)=>cx(base,horizontalLines&&'border-b border-border-table last:border-0');
 const cellClass=(base:string)=>cx(base,verticalLines&&'border-r border-border-table last:border-r-0',appearance.density==='compact'&&'py-1.5');
 const grid=appearance.grid??'horizontal';
 const chartGrid=grid!=='none'?<CartesianGrid stroke="var(--color-separator-border)" strokeDasharray="0" horizontal={grid==='horizontal'||grid==='both'} vertical={grid==='vertical'||grid==='both'}/>:null;
 const cell=(value:unknown,m:string)=>/_pop$|_yoy$/.test(m)?<ComparisonBadge value={value} metric={m} label={m.endsWith('_pop')?'PoP':'YoY'}/>:format(value,m,widget.currency);
 if(widget.kind==='metric')return <article className="dashboard-report-card dashboard-metric-card h-full rounded-3xl border border-border-button-default bg-background-primary-default p-5">
  <EditableTitle key={widget.title} title={widget.title} editable={editable} onChange={onTitleChange} compact/><p className="mt-3 text-title-1-semibold text-text-primary tabular-nums">{format(widget.rows[0]?.[metric],metric,widget.currency)}</p>
  <div className="mt-4 flex flex-wrap items-start gap-2">{(['pop','yoy'] as const).map(mode=><span key={mode} title={widget.comparisons?`${widget.comparisons[mode].range.start} – ${widget.comparisons[mode].range.end}`:undefined}><ComparisonBadge value={widget.rows[0]?.[metric+'_'+mode]} metric={metric} label={mode==='pop'?'PoP':'YoY'}/></span>)}</div>
  <>{appearance.caption!==null&&<div className="mt-4 flex items-center gap-1.5 text-caption-2-regular text-text-tertiary">{appearance.caption===undefined?<><span className="size-1.5 rounded-full bg-status-lime-text"/>{CHANNEL_NAMES[widget.source]}{['spend','revenue','cpc','cpa','campaignRevenue','flowRevenue'].includes(metric)?` · ${widget.currency}`:''}</>:appearance.caption}</div>}</>
 </article>;
 const legend=<ChartLegend metrics={widget.metrics} labelFor={labelFor} colorFor={colorFor} editing={editing} setEditing={setEditing} onColorChange={onColorChange} editable={editable}/>;
 const tooltip=<Tooltip active={editable?undefined:false} contentStyle={{background:'var(--color-background-primary-default)',borderColor:'var(--color-border-button-default)',borderRadius:12,color:'var(--color-text-primary)'}} formatter={(value,name)=>[format(value,String(name),widget.currency),labelFor(String(name))]}/>;
 return <section className="dashboard-report-card min-w-0 rounded-3xl border border-border-button-default bg-background-primary-default p-5">
  <header className="dashboard-component-heading mb-5 flex flex-wrap items-center justify-between gap-2"><EditableTitle key={widget.title} title={widget.title} editable={editable} onChange={onTitleChange}/></header>
  {widget.kind==='table'?<>
   <div className="overflow-x-auto"><table className={cx("w-full whitespace-nowrap text-left text-caption-1-regular",appearance.stripedRows!==false&&"dashboard-table-striped")}>{appearance.tableHeader!==false&&<thead><tr className={cx(horizontalLines&&'border-b border-border-table','text-text-tertiary')}><th className={cellClass('py-3 pr-6 text-caption-1-medium')}>{widget.groupBy==='campaign'?'Campaign / flow':widget.groupBy==='day'?'Date':'Channel'}</th>{widget.metrics.map(m=><th key={m} className={cellClass('px-3 py-3 text-right text-caption-1-medium')}>{labelFor(m)}</th>)}</tr></thead>}<tbody>{widget.rows.slice(0,expanded?250:8).map(row=><tr key={row.label} className={rowClass('text-text-secondary')}><td className={cellClass('max-w-80 truncate py-3 pr-6')} title={row.label}>{row.label}</td>{widget.metrics.map(m=><td key={m} className={cellClass('px-3 py-3 text-right tabular-nums')}>{cell(row[m],m)}</td>)}</tr>)}</tbody></table></div>
   {widget.rows.length>8&&<Button variant="ghost" size="small" className="mt-3" onClick={()=>setExpanded(!expanded)}>{expanded?'Show fewer':`Show all ${widget.rows.length} rows`}</Button>}
  </>:<>
   <div className="h-64 w-full min-w-0" role="group" aria-label={widget.title}>
    <ResponsiveContainer width="100%" height="100%">{widget.kind==='line'?<LineChart data={widget.rows} margin={{left:0,right:10,top:5,bottom:5}}>
     {chartGrid}<XAxis dataKey="label" tickFormatter={label=>String(label).slice(5).replace('-','/')} tick={{fill:'var(--color-text-secondary)',fontSize:11}} tickLine={false} axisLine={false} minTickGap={30}/><YAxis tickFormatter={v=>format(v,metric,widget.currency,true)} tick={{fill:'var(--color-text-secondary)',fontSize:11}} tickLine={false} axisLine={false} width={60}/>{tooltip}{appearance.legend!==false&&<Legend verticalAlign="top" align="center" content={legend}/>}
     {widget.metrics.map(m=><Line key={m} name={m} dataKey={m} type="linear" stroke={colorFor(m)} strokeWidth={2} dot={false} isAnimationActive={false} style={{cursor:'pointer'}} onClick={()=>{if(editable)setEditing(m);}} activeDot={editable?{onClick:()=>setEditing(m),cursor:'pointer'}:false}>{appearance.dataLabels==='show'&&<LabelList dataKey={m} position="top" formatter={value=>format(value,m,widget.currency)} style={{fill:colorFor(m),fontSize:10}}/>}</Line>)}</LineChart>:<BarChart data={widget.rows.slice(0,12)} margin={{left:0,right:10,top:20,bottom:20}}>
     {chartGrid}<XAxis dataKey="label" tick={{fill:'var(--color-text-secondary)',fontSize:10}} tickLine={false} axisLine={false} tickFormatter={s=>widget.groupBy==='day'?String(s).slice(5).replace('-','/'):String(s).replaceAll('_',' ')}/><YAxis tickFormatter={v=>format(v,metric,widget.currency,true)} tick={{fill:'var(--color-text-secondary)',fontSize:11}} tickLine={false} axisLine={false} width={50}/>{tooltip}{appearance.legend!==false&&<Legend verticalAlign="top" align="center" content={legend}/>}
     {widget.metrics.map(m=><Bar key={m} name={m} dataKey={m} fill={colorFor(m)} radius={0} isAnimationActive={false} style={{cursor:'pointer'}} onClick={()=>{if(editable)setEditing(m);}}>{(appearance.dataLabels==='show'||(appearance.dataLabels!=='hide'&&widget.rows.length<=8&&widget.metrics.length<=2))&&<LabelList dataKey={m} position="top" formatter={value=>format(value,m,widget.currency)} style={{fill:colorFor(m),fontSize:10}}/>}</Bar>)}</BarChart>}</ResponsiveContainer>
   </div>
   {appearance.chartData!==false&&<details className="mt-3 text-caption-1-regular text-text-secondary"><summary className="cursor-pointer text-status-purple-text">View chart data ({widget.kind==='bar'?Math.min(12,widget.rows.length):widget.rows.length} rows)</summary>
    <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-border-table"><table className={cx("w-full text-left text-caption-1-regular",appearance.stripedRows!==false&&"dashboard-table-striped")}>{appearance.tableHeader!==false&&<thead className="bg-background-secondary-default"><tr className={cx(horizontalLines&&'border-b border-border-table')}><th className={cellClass('p-3 text-caption-1-medium')}>{widget.kind==='line'?'Date':'Channel'}</th>{widget.metrics.map(m=><th key={m} className={cellClass('p-3 text-right text-caption-1-medium')} style={{color:colorFor(m)}}><span className="mr-2 inline-block size-2 rounded-full" style={{backgroundColor:colorFor(m)}}/>{labelFor(m)}</th>)}</tr></thead>}<tbody>{widget.rows.slice(0,widget.kind==='bar'?12:250).map(row=><tr key={row.label} className={rowClass()}><td className={cellClass('p-3')}>{row.label}</td>{widget.metrics.map(m=><td key={m} className={cellClass('p-3 text-right tabular-nums')} style={{color:colorFor(m)}}>{format(row[m],m,widget.currency)}</td>)}</tr>)}</tbody></table></div>
   </details>}
  </>}
 </section>;
}

export function WidgetView({widget,editable=true,onTextChange,textFocus=false,...props}:{widget:(Widget&Dataset)|TextBlockData;editable?:boolean;onTextChange?:(change:TextChange)=>void;textFocus?:boolean;appearance?:ComponentAppearance;onTitleChange?:(title:string)=>void;colorOverrides?:Record<string,string>;onColorChange?:(metric:string,color:string|null)=>void}){return widget.kind==='text'?<TextBlock key={widget.title+"\0"+widget.content} widget={widget} editable={editable} focusOnMount={textFocus} onChange={onTextChange}/>:<DataWidgetView widget={widget} editable={editable} {...props}/>;}
