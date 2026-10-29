"use client";

import {Suspense, use, useState, type CSSProperties, type ReactNode} from "react";
import {Tabs, Toggle} from "radix-ui";
import {useReducedMotion} from "motion/react";
import {CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {useSiteLanguage} from "@/components/application/dashboard/site-language-provider";
import {aggregatePaidOverview} from "@/lib/overview-metrics";
import {overviewHeadlineMetrics, formatOverviewHeadlineMetrics, type OverviewHeadlineMetrics} from "@/lib/overview-headline-metrics";
import type {EdmTestingData} from "@/lib/testing-edm";
import type {GoogleSearchTest} from "@/lib/testing-google";
import type {MetaCampaignTest} from "@/lib/testing-meta";
import type {RedditTestingData} from "@/lib/testing-reddit";
import type {OverviewTrendMetric, OverviewTrendPoint, OverviewTrends} from "@/lib/overview-daily-metrics";
import styles from "./nova-preview-metrics.module.css";
import chartStyles from "./nova-preview-metric-controls.module.css";

type Metric={spend:number;revenue:number;orders:number;clicks:number};
type Segment={label:string;value:number;display:string;color:string;note?:string};
const channelStyle={Google:{color:"#329bd5"},Meta:{color:"#8c63cc"},Reddit:{color:"#dd6d9f"},EDM:{color:"#75ac35"}};
const assetStyle={Mixed:{color:"#3bb7a1"},Message:{color:"#79af38"},Picture:{color:"#dd6d9f"},Video:{color:"#8c63cc"}};
const currency=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}),number=new Intl.NumberFormat("en-US",{maximumFractionDigits:0}),percent=new Intl.NumberFormat("en-US",{style:"percent",minimumFractionDigits:2,maximumFractionDigits:2});
const preciseCurrency=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2});
const empty=():Metric=>({spend:0,revenue:0,orders:0,clicks:0});
const add=(target:Metric,row:Metric)=>{target.spend+=row.spend;target.revenue+=row.revenue;target.orders+=row.orders;target.clicks+=row.clicks;};
const ratio=(a:number,b:number)=>b>0?a/b:null;
const showRatio=(value:number|null,suffix="")=>value==null?"—":`${value.toFixed(2)}${suffix}`;


export function NovaPreviewBusinessPerformance({google,meta,reddit,edm,headlineMetrics,trends}:{google:GoogleSearchTest[];meta:MetaCampaignTest;reddit:RedditTestingData;edm:EdmTestingData;headlineMetrics?:OverviewHeadlineMetrics;trends:Promise<OverviewTrends>}){
  const {language}=useSiteLanguage();
  const headline=formatOverviewHeadlineMetrics(headlineMetrics??overviewHeadlineMetrics({google,meta,reddit,edm}));
  const searchGroups=google.flatMap(test=>test.groups);
  const channels:Record<keyof typeof channelStyle,Metric>={Google:empty(),Meta:empty(),Reddit:empty(),EDM:empty()};
  searchGroups.forEach(row=>add(channels.Google,row));add(channels.Meta,meta.totals);reddit.campaigns.flatMap(campaign=>campaign.groups).flatMap(group=>group.activeAds).forEach(row=>add(channels.Reddit,row));edm.tests.forEach(row=>add(channels.EDM,{spend:0,revenue:row.revenue,orders:row.orders,clicks:row.clicks??0}));
  const paid=aggregatePaidOverview([...searchGroups,meta.totals,...reddit.campaigns.flatMap(campaign=>campaign.groups).flatMap(group=>group.activeAds)]);
  const metaReach=meta.totals.reach;
  const redditReach=reddit.campaigns.length&&reddit.campaigns.every(campaign=>Number.isFinite(campaign.reach))?reddit.campaigns.reduce((sum,campaign)=>sum+campaign.reach,0):null;
  const googleValues=google.map(campaign=>campaign.reach).filter((value):value is number=>value!=null);
  const googleReach=googleValues.length?googleValues.reduce((sum,value)=>sum+value,0):null;
  const edmDelivered=edm.tests.reduce((sum,test)=>sum+test.delivered,0);
  const edmUniqueClicks=edm.tests.reduce((sum,test)=>sum+(test.clicks??0),0);
  const edmCtr=edmDelivered>0&&edm.tests.every(test=>test.clicks!=null)?edmUniqueClicks/edmDelivered:null;
  const uniqueValues=[googleReach,metaReach,redditReach,edm.uniqueRecipients].filter((value):value is number=>value!=null);
  const uniqueReach=uniqueValues.length?uniqueValues.reduce((sum,value)=>sum+value,0):null;
  const uniqueSegments:Segment[]=[{label:"Google",value:googleReach??0,display:googleReach==null?"—":number.format(googleReach),...channelStyle.Google},{label:"Meta",value:metaReach??0,display:metaReach==null?"—":number.format(metaReach),...channelStyle.Meta},{label:"Reddit",value:redditReach??0,display:redditReach==null?"—":number.format(redditReach),...channelStyle.Reddit},{label:"EDM",value:edm.uniqueRecipients??0,display:edm.uniqueRecipients==null?"—":number.format(edm.uniqueRecipients),...channelStyle.EDM}];
  const reachSegments:Segment[]=[{label:"Google",value:googleReach??0,display:googleReach==null?"—":number.format(googleReach),...channelStyle.Google},{label:"Meta",value:metaReach??0,display:metaReach==null?"—":number.format(metaReach),...channelStyle.Meta},{label:"Reddit",value:redditReach??0,display:redditReach==null?"—":number.format(redditReach),...channelStyle.Reddit},{label:"EDM",value:edmDelivered,display:number.format(edmDelivered),...channelStyle.EDM}];
  const ctrSegments:Segment[]=[{label:"Google",rows:google.filter(test=>test.channel!=="pmax").flatMap(test=>test.groups)},{label:"Meta",rows:[meta.totals]},{label:"Reddit",rows:reddit.campaigns.flatMap(campaign=>campaign.groups).flatMap(group=>group.activeAds)}].map(({label,rows})=>{const result=aggregatePaidOverview(rows);return {label,value:result.impressions??0,display:result.ctr==null?"—":percent.format(result.ctr),...channelStyle[label as keyof typeof channelStyle]};});
  ctrSegments.push({label:"EDM",note:edmDelivered===0?"Delivered 0":"email only",value:edmDelivered,display:edmCtr==null?"—":percent.format(edmCtr),...channelStyle.EDM});
  const assetCounts={Mixed:0,Message:edm.tests.length,Picture:0,Video:0};
  google.forEach(test=>{assetCounts[test.creativeType??"Message"]+=test.adCount??test.groups.length;});
  const assetMetrics:Record<keyof typeof assetStyle,Metric>={Mixed:empty(),Message:empty(),Picture:empty(),Video:empty()},paidAssetMetrics:Record<keyof typeof assetStyle,Metric>={Mixed:empty(),Message:empty(),Picture:empty(),Video:empty()};
  const assetRows:Array<Metric&{type:keyof typeof assetStyle;paid:boolean}>=[];
  google.forEach(test=>test.groups.forEach(row=>assetRows.push({...row,type:test.creativeType??"Message",paid:true})));
  meta.adGroups.flatMap(group=>group.activeAds).forEach(row=>{assetCounts[row.mediaType==="Image"?"Picture":"Video"]++;assetRows.push({...row,type:row.mediaType==="Image"?"Picture":"Video",paid:true});});
  reddit.campaigns.flatMap(campaign=>campaign.groups).flatMap(group=>group.activeAds).forEach(row=>{const type=row.contentType==="Image"?"Picture":row.contentType==="Video"?"Video":"Message";assetCounts[type]++;assetRows.push({...row,type,paid:true});});
  edm.tests.forEach(row=>assetRows.push({spend:0,revenue:row.revenue,orders:row.orders,clicks:row.clicks??0,type:"Message",paid:false}));
  assetRows.forEach(row=>{add(assetMetrics[row.type],row);if(row.paid)add(paidAssetMetrics[row.type],row);});
  const averageCvr=(()=>{const values=assetRows.filter(row=>row.clicks>0).map(row=>row.orders/row.clicks);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;})();
  const channelSegments=(metric:"revenue"|"orders",formatter:(value:number)=>string):Segment[]=>(Object.keys(channelStyle) as Array<keyof typeof channelStyle>).map(label=>({label,value:channels[label][metric],display:formatter(channels[label][metric]),...channelStyle[label]}));
  const channelRoas:Segment[]=(Object.keys(channelStyle) as Array<keyof typeof channelStyle>).map(label=>({label,value:channels[label].spend,display:showRatio(ratio(channels[label].revenue,channels[label].spend)),...channelStyle[label]}));
  const channelCvr:Segment[]=(Object.keys(channelStyle) as Array<keyof typeof channelStyle>).map(label=>({label,value:channels[label].clicks,display:channels[label].clicks?percent.format(channels[label].orders/channels[label].clicks):"—",...channelStyle[label]}));
  const assetRoas:Segment[]=(Object.keys(assetStyle) as Array<keyof typeof assetStyle>).map(label=>({label,value:paidAssetMetrics[label].spend,display:showRatio(ratio(paidAssetMetrics[label].revenue,paidAssetMetrics[label].spend)),...assetStyle[label]}));
  const assetCvr:Segment[]=(Object.keys(assetStyle) as Array<keyof typeof assetStyle>).map(label=>({label,value:assetMetrics[label].clicks,display:assetMetrics[label].clicks?percent.format(assetMetrics[label].orders/assetMetrics[label].clicks):"—",...assetStyle[label]}));
  const channelCounts={Google:google.reduce((sum,test)=>sum+(test.adCount??test.groups.length),0),Meta:meta.adGroups.reduce((sum,group)=>sum+group.activeAds.length,0),Reddit:reddit.campaigns.flatMap(campaign=>campaign.groups).reduce((sum,group)=>sum+group.activeAds.length,0),EDM:edm.tests.length};
  const countSegments:Segment[]=(Object.keys(channelStyle) as Array<keyof typeof channelStyle>).map(label=>({label,value:channelCounts[label],display:number.format(channelCounts[label]),...channelStyle[label]}));
  return <section className={styles.section} aria-labelledby="overview-metrics"><h2 id="overview-metrics" className={styles.sectionTitle}>{language==='zh'?'业务表现':'Business Performance'}</h2><div className={styles.grid}>
    <NovaMetricCard wide title="Total ROAS" metric="roas" trends={trends} value={headline.roas} valueDetail={`${preciseCurrency.format(paid.revenue)} conversion value / ${preciseCurrency.format(paid.spend)} spend · Google, Meta, Reddit`} caption="Paid conversion value / paid spend" segments={channelRoas} assetSegments={assetRoas}/>
    <NovaMetricCard wide title="Total Conversion Rate" metric="cvr" trends={trends} value={averageCvr==null?"—":percent.format(averageCvr)} caption="Average asset conversion rate" segments={channelCvr} assetSegments={assetCvr}/>
    <NovaMetricCard title="Total Number of Assets" metric="assets" trends={trends} value={number.format(Object.values(assetCounts).reduce((a,b)=>a+b,0))} caption="Tested assets" segments={countSegments}/>
    <NovaMetricCard title="Total Revenue" metric="revenue" trends={trends} value={headline.revenue} caption="Attributed revenue" segments={channelSegments("revenue",currency.format)}/>
    <NovaMetricCard title="Total Orders" metric="orders" trends={trends} value={headline.orders} caption="Attributed orders" segments={channelSegments("orders",number.format)}/>
    <NovaMetricCard title="Total Reach" metric="reach" trends={trends} value={headline.totalReach} caption="Reach" segments={reachSegments}/>
    <NovaMetricCard title="Unique Reach" metric="uniqueReach" trends={trends} value={uniqueReach==null?"—":number.format(uniqueReach)} caption="Unique Reach" segments={uniqueSegments}/>
    <NovaMetricCard title="CTR" metric="ctr" trends={trends} value={headline.ctr} caption="Ad clicks / ad impressions · excludes PMAX and EDM" segments={ctrSegments}/>
  </div></section>;
}

const compact = new Intl.NumberFormat("en-US", {notation:"compact", maximumFractionDigits:1});
const chartNumber = new Intl.NumberFormat("en-US", {maximumFractionDigits:2});
const chartCurrency = new Intl.NumberFormat("en-US", {style:"currency",currency:"USD",maximumFractionDigits:2});
const chartPercent = new Intl.NumberFormat("en-US", {style:"percent",maximumFractionDigits:2});
const dayLabel = (date:string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"UTC"});
const detailedDate = (date:string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"});
const displayChartValue = (metric:OverviewTrendMetric, value:number|null|undefined) => value==null?"—":metric==="revenue"?chartCurrency.format(value):metric==="ctr"||metric==="cvr"?chartPercent.format(value):metric==="roas"?`${chartNumber.format(value)}×`:chartNumber.format(value);
const colorStyle = (color:string) => ({"--metric-color":color} as CSSProperties);

function NovaTooltip({active,payload,label,segments,metric,highlight}:{active?:boolean;payload?:ReadonlyArray<{payload?:OverviewTrendPoint}>;label?:string|number;segments:Segment[];metric:OverviewTrendMetric;highlight:string|null}) {
  const row=payload?.[0]?.payload;
  if (!active||!row) return null;
  return <div className={styles.tooltip}><p className={styles.tooltipDate}>{detailedDate(String(label??row.date))}</p>{segments.map(segment=><div key={segment.label} className={styles.tooltipRow} data-muted={Boolean(highlight&&highlight!==segment.label)}><span><i className={styles.dot} style={colorStyle(segment.color)}/>{segment.label}{segment.note?` (${segment.note})`:""}</span><strong>{displayChartValue(metric,row[segment.label as keyof Omit<OverviewTrendPoint,"date">])}</strong></div>)}</div>;
}

function NovaDailyChart({trends,metric,segments,highlight,title}:{trends:Promise<OverviewTrends>;metric:OverviewTrendMetric;segments:Segment[];highlight:string|null;title:string}) {
  const {metrics,issues}=use(trends);
  const {language}=useSiteLanguage();
  const reduced=useReducedMotion();
  const rows=metrics[metric];
  const hasData=rows.some(row=>segments.some(segment=>typeof row[segment.label as keyof Omit<OverviewTrendPoint,"date">]==="number"));
  return <><div className={styles.chart} aria-label={`${title}, daily trend. Use left and right arrow keys on the chart to inspect dates.`}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}><LineChart data={rows} accessibilityLayer margin={{top:8,right:8,left:0,bottom:0}}>
      <CartesianGrid vertical={false} stroke="var(--nova-border, #e5e7eb)" strokeDasharray="3 5"/>
      <XAxis dataKey="date" axisLine={false} tickLine={false} tickFormatter={dayLabel} minTickGap={32} tickMargin={8} tick={{fill:"var(--nova-muted, #69717d)",fontSize:11}}/>
      <YAxis width={48} axisLine={false} tickLine={false} tickCount={3} allowDecimals={metric!=="assets"} tickFormatter={value=>metric==="ctr"||metric==="cvr"?chartPercent.format(value):metric==="roas"?`${compact.format(value)}×`:metric==="revenue"?`$${compact.format(value)}`:compact.format(value)} tick={{fill:"var(--nova-muted, #69717d)",fontSize:11}}/>
      <Tooltip filterNull={false} cursor={{stroke:"var(--nova-border, #e5e7eb)",strokeDasharray:"4 4"}} content={<NovaTooltip segments={segments} metric={metric} highlight={highlight}/>} wrapperStyle={{zIndex:20}}/>
      {segments.map(segment=><Line key={segment.label} dataKey={segment.label} name={segment.label} type="linear" stroke={segment.color} strokeWidth={highlight===segment.label?3:2} strokeOpacity={highlight&&highlight!==segment.label?0.16:1} dot={{r:2,strokeWidth:0,fill:segment.color}} activeDot={{r:4,fill:segment.color,stroke:"var(--nova-surface, #fff)",strokeWidth:2}} connectNulls={false} isAnimationActive={!reduced} animationDuration={450}/>)}
    </LineChart></ResponsiveContainer>
    {!hasData&&<div className={styles.empty}>{language==="zh"?"暂无每日趋势数据":"Daily data unavailable"}</div>}
  </div>{issues.length>0&&<p className={styles.issues}>{issues.join(" · ")}</p>}</>;
}

function NovaMetricCard({title,value,valueDetail,caption,segments,assetSegments,metric,trends,wide=false}:{title:string;value:string;valueDetail?:ReactNode;caption:string;segments:Segment[];assetSegments?:Segment[];metric:OverviewTrendMetric;trends:Promise<OverviewTrends>;wide?:boolean}) {
  const {language}=useSiteLanguage();
  const [mode,setMode]=useState<"channel"|"asset">("channel");
  const [hovered,setHovered]=useState<string|null>(null);
  const [selected,setSelected]=useState<string|null>(null);
  const highlight=hovered??selected;
  const activeSegments=mode==="asset"&&assetSegments?assetSegments:segments;
  const total=segments.reduce((sum,segment)=>sum+Math.max(0,segment.value),0);
  const showDistribution=metric!=="roas"&&metric!=="cvr"&&metric!=="ctr";
  const current=segments.find(segment=>segment.label===highlight)??segments.find(segment=>segment.value>0)??segments[0];
  const share=total>0?(current?.value??0)/total:0;
  const chart=<>
    <div className={styles.legend} aria-label={`${title} ${mode} highlights`} onMouseLeave={()=>setHovered(null)}>{activeSegments.map(segment=><Toggle.Root key={segment.label} pressed={selected===segment.label} onPressedChange={pressed=>setSelected(pressed?segment.label:null)} aria-label={`Highlight ${segment.label} in ${title}${mode==="asset"?" asset trend":""}`} onMouseEnter={()=>setHovered(segment.label)} onFocus={()=>setHovered(segment.label)} onBlur={()=>setHovered(null)} className={styles.legendButton} data-muted={Boolean(highlight&&highlight!==segment.label)}><span className={styles.dot} style={colorStyle(segment.color)}/><span>{segment.label}</span>{segment.note&&<span className={styles.legendNote}>({segment.note})</span>}<strong>{segment.display}</strong></Toggle.Root>)}</div>
    <Suspense fallback={<div className={styles.chartLoading} role="status">{language==='zh'?'正在加载每日趋势…':'Loading daily trend…'}</div>}><NovaDailyChart key={mode} trends={trends} metric={metric} segments={activeSegments} highlight={highlight} title={title}/></Suspense>
  </>;
  return <article className={styles.card} data-wide={wide}>
    <div className={styles.cardHeading}><div className={styles.cardMetric}><h3 className={styles.cardTitle}>{title}</h3><div className={styles.valueRow}><p className={styles.cardValue}>{value}</p>{valueDetail&&<p className={styles.valueDetail}>{valueDetail}</p>}</div></div>{showDistribution&&<div className={styles.share}><strong>{new Intl.NumberFormat("en-US",{style:"percent",maximumFractionDigits:0}).format(share)}</strong><span>{current?.label}</span></div>}</div>
    {showDistribution&&<div className={styles.distribution} role="group" aria-label={`${title} selected-period distribution`} onMouseLeave={()=>setHovered(null)}>{total>0?segments.filter(segment=>segment.value>0).map(segment=><Toggle.Root key={segment.label} pressed={selected===segment.label} onPressedChange={pressed=>setSelected(pressed?segment.label:null)} aria-label={`${segment.label}: ${segment.display}, ${Math.round(segment.value/total*100)}% of ${caption}`} onMouseEnter={()=>setHovered(segment.label)} onFocus={()=>setHovered(segment.label)} onBlur={()=>setHovered(null)} className={styles.distributionButton} data-muted={Boolean(highlight&&highlight!==segment.label)} style={{...colorStyle(segment.color),flexGrow:Math.max(segment.value/total*100,2)}}><span/></Toggle.Root>):<span className={styles.distributionEmpty}/>}</div>}
    {assetSegments?<Tabs.Root value={mode} onValueChange={value=>{if(value==="channel"||value==="asset"){setMode(value);setHovered(null);setSelected(null);}}}>
      <Tabs.List className={chartStyles.chartModes} aria-label={language==="zh"?`${title} 图表维度`:`${title} chart breakdown`}>
        <Tabs.Trigger value="channel" className={chartStyles.chartMode}>{language==="zh"?"按渠道":"By channel"}</Tabs.Trigger>
        <Tabs.Trigger value="asset" className={chartStyles.chartMode}>{language==="zh"?"按素材":"By asset"}</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value={mode} className={chartStyles.chartContent}>{chart}</Tabs.Content>
    </Tabs.Root>:chart}
  </article>;
}
