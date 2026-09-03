"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { RiArrowDownLine, RiArrowRightSLine, RiArrowUpLine, RiCalendarLine, RiCheckLine, RiFileCopyLine, RiHome5Line, RiMegaphoneLine, RiMenuLine, RiSearchLine, RiShoppingBag3Line } from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select, SelectItem } from "@/components/base/select/select";
import { DateRangePicker, type DateRangeValue } from "@/components/base/date-picker/date-range-picker";
import { parseDate } from "@internationalized/date";
import { cx } from "@/utils/cx";
import type { BrandKeywordRow, DashboardMetric, DashboardRow, GoogleAdsDashboardData } from "@/lib/google-ads-types";
import { SidebarProjectLink } from "@/components/brand/sidebar-project-link";

type Row = { name: string; cost: string; revenue: string; roas: string; conversions: string; impressions: string; clicks: string; ctr: string; cvr: string; cpa: string; aov: string; impressionShare: string; delta: number|null; absChange:number|null };
const nav = ["Overview", "Campaigns"];

function Delta({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value == null) return <span className="rounded-full bg-background-secondary-default px-2 py-1 text-caption-1-semibold text-text-tertiary">No prior data</span>;
  const good = inverse ? value <= 0 : value >= 0;
  const Icon = value >= 0 ? RiArrowUpLine : RiArrowDownLine;
  return <span className={cx("inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-caption-1-semibold", good ? "bg-state-success-base text-state-success-text" : "bg-background-tertiary-error text-text-error-primary")}><Icon className="size-3" aria-hidden />{Math.abs(value).toFixed(1)}%</span>;
}

function DataTable({ rows, firstLabel, extended = false, changeLabel, showImpressionShare = true }: { rows: Row[]; firstLabel: string; extended?: boolean; changeLabel?: "Spend"|"Conversions"; showImpressionShare?:boolean }) {
  const headers = ["Cost", "Conv. value", "ROAS", "Conversions", ...(changeLabel?[`Δ ${changeLabel}`,"Abs Change"]:[]), "Impressions", "Clicks", "CTR", ...(extended ? ["CVR","CPA","AOV",...(showImpressionShare?["Impr Share"]:[])] : [])];
  const signedChange=(value:number|null)=>value==null?"—":Math.abs(value)>999?(value>=0?">999%":"<-999%"): `${value>=0?"+":""}${value.toFixed(1)}%`;
  const absoluteChange=(value:number|null)=>value==null?"—":changeLabel==="Spend"?currency.format(value):number.format(value);
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse"><thead><tr className="border-b border-border-table text-left text-caption-1-semibold text-text-tertiary"><th className="px-4 py-3">{firstLabel}</th>{headers.map(x => <th key={x} className="px-4 py-3 text-right">{x}</th>)}</tr></thead><tbody>{rows.map(row => { const values=[row.cost,row.revenue,row.roas,row.conversions,...(changeLabel?[signedChange(row.delta),absoluteChange(row.absChange)]:[]),row.impressions,row.clicks,row.ctr,...(extended?[row.cvr,row.cpa,row.aov,...(showImpressionShare?[row.impressionShare]:[])]:[])]; return <tr key={row.name} className="border-b border-border-table last:border-0 hover:bg-background-primary-hover"><td className="px-4 py-3 text-body-medium text-text-primary">{row.name}</td>{values.map((v,i) => <td key={i} className="px-4 py-3 text-right text-body-regular tabular-nums text-text-secondary">{v}</td>)}</tr>})}</tbody></table></div>;
}

function MetricCell({ value, delta, inverse=false }: { value:string; delta:number|null; inverse?:boolean }) {
  const positive=delta!=null&&(inverse?delta<=0:delta>=0); const Icon=(delta??0)>=0?RiArrowUpLine:RiArrowDownLine;
  const deltaLabel=delta!=null&&Math.abs(delta)>999?">999%":`${Math.abs(delta??0).toFixed(1)}%`;
  return <span className="inline-flex items-start justify-end gap-1.5 whitespace-nowrap"><span>{value}</span>{delta==null?<sup title="No activity in the comparison period" className="rounded-full bg-background-tertiary-default px-1.5 py-0.5 text-caption-2-semibold text-text-secondary">NEW</sup>:<sup className={cx("inline-flex items-center text-caption-2-semibold",positive?"text-state-success-text":"text-text-error-primary")}><Icon className="size-3" />{deltaLabel}</sup>}</span>;
}

function BrandKeywordTable({ rows }: { rows:BrandKeywordRow[] }) {
  const columns=["Brand keyword","Cost","Conv. value","ROAS","Conversions","Impressions","Clicks","CTR","CVR","CPA","AOV"];
  return <div className="overflow-x-auto"><table className="w-full min-w-[1280px] border-collapse"><thead><tr className="border-b border-border-table text-left text-caption-1-semibold text-text-tertiary">{columns.map((column,index)=><th key={column} className={cx("px-4 py-3",index>0&&"text-right")}>{column}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.name} className={cx("border-b border-border-table last:border-0",row.isTotal?"bg-background-secondary-default":"hover:bg-background-primary-hover")}><td className={cx("px-4 py-3 text-body-medium text-text-primary",row.isTotal&&"text-body-semibold")}>{row.name}</td><td className="px-4 py-3 text-right text-body-regular text-text-secondary"><MetricCell value={currency.format(row.cost)} delta={row.deltas.cost} inverse /></td><td className="px-4 py-3 text-right text-body-regular text-text-secondary"><MetricCell value={currency.format(row.revenue)} delta={row.deltas.revenue} /></td><td className="px-4 py-3 text-right text-body-regular text-text-secondary"><MetricCell value={row.roas==null?"—":row.roas.toFixed(2)} delta={row.deltas.roas} /></td><td className="px-4 py-3 text-right text-body-regular text-text-secondary"><MetricCell value={number.format(row.conversions)} delta={row.deltas.conversions} /></td><td className="px-4 py-3 text-right text-body-regular text-text-secondary"><MetricCell value={compact.format(row.impressions)} delta={row.deltas.impressions} /></td><td className="px-4 py-3 text-right text-body-regular text-text-secondary"><MetricCell value={compact.format(row.clicks)} delta={row.deltas.clicks} /></td><td className="px-4 py-3 text-right text-body-regular text-text-secondary"><MetricCell value={row.ctr==null?"—":`${(row.ctr*100).toFixed(2)}%`} delta={row.deltas.ctr} /></td><td className="px-4 py-3 text-right text-body-regular text-text-secondary"><MetricCell value={row.cvr==null?"—":`${(row.cvr*100).toFixed(2)}%`} delta={row.deltas.cvr} /></td><td className="px-4 py-3 text-right text-body-regular text-text-secondary"><MetricCell value={row.cpa==null?"—":currency.format(row.cpa)} delta={row.deltas.cpa} inverse /></td><td className="px-4 py-3 text-right text-body-regular text-text-secondary"><MetricCell value={row.aov==null?"—":currency.format(row.aov)} delta={row.deltas.aov} /></td></tr>)}</tbody></table></div>;
}

function productImageFallback(name:string) {
  if (/ROPOT-Travel/i.test(name)) return "https://cdn.shopify.com/s/files/1/0687/3402/5956/files/P_ROPOT-Travel_Blue_Hydrogen.png?v=1771945469";
  if (/ROPOT-Lite/i.test(name)&&/White/i.test(name)) return "https://cdn.shopify.com/s/files/1/0687/3402/5956/files/P_ROPOT-Lite_White_Hydrogen.png?v=1771945714";
  if (/ROPOT-Lite/i.test(name)) return "https://cdn.shopify.com/s/files/1/0687/3402/5956/files/P_ROPOT-Lite_Blue_Hydrogen.png?v=1771945714";
  if (/ROPOT/i.test(name)) return "https://cdn.shopify.com/s/files/1/0687/3402/5956/files/P_ROPOT_Hydrogen.png?v=1771945768";
  return null;
}

function ProductImage({src,name}:{src:string|null;name:string}) {
  const fallback=productImageFallback(name);
  const [currentSrc,setCurrentSrc]=useState<string|null>(src??fallback);
  if (!currentSrc) return <div className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-background-secondary-default text-foreground-icon-tertiary"><RiShoppingBag3Line className="size-6" /></div>;
  return <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-border-button-default bg-background-secondary-default"><Image src={currentSrc} alt={name} fill sizes="80px" className="object-contain" onError={()=>setCurrentSrc(currentSrc===fallback?null:fallback)} /></div>;
}

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });
const channelName = (name: string) => ({ PERFORMANCE_MAX: "PMAX", DEMAND_GEN: "Demand Gen", VIDEO: "YouTube" }[name] ?? name.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()));
const formatMetric = (metric: DashboardMetric) => metric.value == null ? "—" : metric.format === "currency" ? currency.format(metric.value) : metric.format === "percent" ? `${(metric.value * 100).toFixed(2)}%` : metric.format === "ratio" ? metric.value.toFixed(2) : metric.format === "compact" ? compact.format(metric.value) : number.format(metric.value);
const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
const displayRows = (rows: DashboardRow[]): Row[] => rows.map(row => ({ name: channelName(row.name), cost: currency.format(row.cost), revenue: currency.format(row.revenue), roas: row.roas == null ? "—" : row.roas.toFixed(2), conversions: number.format(row.conversions), impressions: compact.format(row.impressions), clicks: compact.format(row.clicks), ctr: row.ctr == null ? "—" : `${(row.ctr * 100).toFixed(2)}%`, cvr: row.clicks ? `${(row.conversions/row.clicks*100).toFixed(2)}%` : "—", cpa: row.conversions ? currency.format(row.cost/row.conversions) : "—", aov: row.conversions ? currency.format(row.revenue/row.conversions) : "—", impressionShare: row.impressionShare == null ? "—" : `${(row.impressionShare*100).toFixed(1)}%`, delta:row.delta??null,absChange:row.absChange??null }));
type PeriodPreset = "last7" | "last14" | "last30" | "thisMonth" | "lastMonth" | "qtd" | "ytd" | "custom";
type SearchTermSort = "spend" | "conversions" | "spend_movers" | "conversion_movers";
const periodLabels: Record<PeriodPreset,string> = { last7:"LAST 7 DAYS",last14:"LAST 14 DAYS",last30:"LAST 30 DAYS",thisMonth:"THIS MONTH",lastMonth:"LAST MONTH",qtd:"QUARTER TO DATE",ytd:"YEAR TO DATE",custom:"CUSTOM" };
const toIso = (date: Date) => date.toISOString().slice(0,10);
const moveDays = (value: string, amount: number) => { const date=new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate()+amount); return toIso(date); };
function presetDates(preset: PeriodPreset, latest: string) {
  const endDate=new Date(`${latest}T12:00:00Z`); let start=latest; let end=latest;
  if (preset.startsWith("last")) { const days=preset==="last7"?7:preset==="last14"?14:30; start=moveDays(latest,-(days-1)); }
  if (preset==="thisMonth") start=toIso(new Date(Date.UTC(endDate.getUTCFullYear(),endDate.getUTCMonth(),1)));
  if (preset==="lastMonth") { start=toIso(new Date(Date.UTC(endDate.getUTCFullYear(),endDate.getUTCMonth()-1,1))); end=toIso(new Date(Date.UTC(endDate.getUTCFullYear(),endDate.getUTCMonth(),0))); }
  if (preset==="qtd") start=toIso(new Date(Date.UTC(endDate.getUTCFullYear(),Math.floor(endDate.getUTCMonth()/3)*3,1)));
  if (preset==="ytd") start=toIso(new Date(Date.UTC(endDate.getUTCFullYear(),0,1)));
  return {start,end};
}

export function GoogleAdsDashboard({ initialData }: { initialData: GoogleAdsDashboardData }) {
  const [data, setData] = useState(initialData);
  const [comparison, setComparison] = useState(initialData.comparison.mode);
  const [period, setPeriod] = useState<PeriodPreset>("last30");
  const [customRange, setCustomRange] = useState<DateRangeValue>({ start: parseDate(initialData.range.start), end: parseDate(initialData.range.end) });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [brandInput, setBrandInput] = useState(initialData.brandFilter);
  const [appliedBrandFilter, setAppliedBrandFilter] = useState(initialData.brandFilter);
  const [searchTermSort, setSearchTermSort] = useState<SearchTermSort>("conversions");
  const [copiedSku, setCopiedSku] = useState<string|null>(null);
  const liveChannels = useMemo(() => displayRows(data.channels), [data.channels]);
  const liveSearches = useMemo(() => displayRows(data.searchTerms), [data.searchTerms]);
  const icons = [RiHome5Line,RiMegaphoneLine];

  async function refresh(nextPeriod: PeriodPreset, nextComparison: "POP" | "YOY", selectedRange?: DateRangeValue, nextBrandFilter = appliedBrandFilter, nextSearchTermSort = searchTermSort) {
    setIsLoading(true); setError(null);
    try {
      const selected = nextPeriod === "custom" && selectedRange ? { start:selectedRange.start.toString(), end:selectedRange.end.toString() } : presetDates(nextPeriod,data.availableThrough);
      const params = new URLSearchParams({ start:selected.start, end:selected.end, comparison:nextComparison, brand:nextBrandFilter, searchSort:nextSearchTermSort });
      const response = await fetch(`/api/google-ads/overview?${params}`);
      if (!response.ok) throw new Error("Unable to load dashboard data");
      setData(await response.json());
    } catch { setError("Could not refresh the live data. Please try again."); }
    finally { setIsLoading(false); }
  }

  function applyBrandFilter() {
    const nextBrandFilter = brandInput.trim() || "blu";
    setBrandInput(nextBrandFilter);
    setAppliedBrandFilter(nextBrandFilter);
    refresh(period, comparison, period === "custom" ? customRange : undefined, nextBrandFilter);
  }

  function changeSearchTermSort(nextSearchTermSort: SearchTermSort) {
    setSearchTermSort(nextSearchTermSort);
    refresh(period, comparison, period === "custom" ? customRange : undefined, appliedBrandFilter, nextSearchTermSort);
  }

  async function copySku(sku:string) {
    await navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    window.setTimeout(()=>setCopiedSku(current=>current===sku?null:current),1500);
  }

  return <div className="min-h-screen bg-background-secondary-default lg:flex">
    <aside className={cx("fixed inset-y-0 left-0 z-30 w-72 border-r border-separator-border bg-background-primary-default p-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0", mobileNav ? "translate-x-0" : "-translate-x-full")}><div className="flex h-full flex-col"><SidebarProjectLink reportName="Dashboard" /><nav className="mt-6 flex flex-col gap-1" aria-label="Dashboard sections">{nav.map((item,i) => { const Icon=icons[i]; return <button key={item} className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-body-medium", i===0 ? "bg-button-ghost-background text-button-ghost-foreground shadow-nav-selected" : "text-text-secondary hover:bg-background-primary-hover hover:text-text-primary")}><Icon className="size-5" />{item}</button>})}</nav><div className="mt-auto rounded-2xl bg-background-secondary-default p-4"><p className="text-caption-1-semibold text-text-tertiary">LAST UPDATED</p><p className="mt-2 text-body-medium text-text-primary">{formatDate(data.latestDate)} · 5:00 AM ET</p><p className="mt-1 text-caption-2-regular text-text-secondary">Refreshes daily</p></div></div></aside>
    {mobileNav && <button className="fixed inset-0 z-20 bg-background-tertiary-default opacity-70 lg:hidden" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-[1500px]">
      <header className="mb-6 flex flex-wrap items-center gap-4"><div className="flex items-center gap-3"><Button iconOnly variant="secondary" leadingIcon={RiMenuLine} className="lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation" /><div><div className="flex items-center gap-1 text-caption-1-semibold text-text-tertiary"><Link href="/bluevua">Bluevua</Link><RiArrowRightSLine className="size-4" />Google Ads</div><h1 className="mt-1 text-title-1-semibold text-text-primary">Google Ads Performance</h1></div></div></header>
      <section className="mb-6 flex flex-wrap items-end gap-3 rounded-3xl border border-border-button-default bg-background-primary-default p-4 shadow-card"><div className="min-w-52 flex-1 sm:flex-none"><label className="mb-1.5 block text-caption-1-semibold text-text-secondary">Reporting period</label><Select selectedKey={period} isDisabled={isLoading} popoverClassName="overflow-visible" listBoxStyle={{maxHeight:"none",overflow:"visible"}} onSelectionChange={k => { const next=String(k) as PeriodPreset; setPeriod(next); if(next!=="custom") refresh(next,comparison); }} aria-label="Reporting period"><SelectItem id="last7">Last 7 Days</SelectItem><SelectItem id="last14">Last 14 Days</SelectItem><SelectItem id="last30">Last 30 Days</SelectItem><SelectItem id="thisMonth">This Month</SelectItem><SelectItem id="lastMonth">Last Month</SelectItem><SelectItem id="qtd">Quarter to Date</SelectItem><SelectItem id="ytd">Year to Date</SelectItem><SelectItem id="custom">Custom</SelectItem></Select></div>{period==="custom"&&<div><label className="mb-1.5 block text-caption-1-semibold text-text-secondary">Custom range</label><DateRangePicker value={customRange} isDisabled={isLoading} aria-label="Custom reporting period" onChange={value=>{if(!value)return;setCustomRange(value);refresh("custom",comparison,value);}} /></div>}<div><label className="mb-1.5 block text-caption-1-semibold text-text-secondary">Comparison</label><div className="flex rounded-2lg bg-background-secondary-default p-1">{(["POP","YOY"] as const).map(v=><button key={v} disabled={isLoading} onClick={()=>{setComparison(v);refresh(period,v,period==="custom"?customRange:undefined);}} className={cx("rounded-lg px-4 py-1.5 text-body-medium", comparison===v ? "bg-background-primary-default text-text-primary shadow-card" : "text-text-secondary")}>{v}</button>)}</div></div><div className="ml-auto hidden items-center gap-2 text-body-regular text-text-secondary sm:flex"><RiCalendarLine className="size-4" /> {formatDate(data.range.start)} – {formatDate(data.range.end)}{isLoading && <span className="agent-progress-loading-text">Refreshing</span>}</div></section>
      {error && <div role="alert" className="mb-6 rounded-2xl border border-border-error-default bg-background-tertiary-error p-4 text-body-medium text-text-error-primary">{error}</div>}
      <section><div className="mb-4 flex items-end justify-between"><div><p className="text-caption-1-semibold text-text-tertiary">{periodLabels[period]} · VS {comparison}</p><h2 className="mt-1 text-title-2-semibold text-text-primary">Overall Performance</h2></div><span className="text-body-medium text-state-success-text">Live Data</span></div><div className={cx("grid grid-cols-2 gap-3 transition-opacity md:grid-cols-4 xl:grid-cols-6",isLoading&&"opacity-60")}>{data.metrics.map((m,i)=><article key={m.label} className={cx("rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-card", i===1 && "col-span-2 md:col-span-1")}><p className="text-body-medium text-text-secondary">{m.label}</p><div className="mt-3 flex flex-wrap items-end justify-between gap-2"><p className="text-title-1-medium tabular-nums text-text-primary">{formatMetric(m)}</p><Delta value={m.delta} inverse={m.inverse} /></div></article>)}</div></section>
      <section className="mt-6"><article className="rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-card"><p className="text-title-3-semibold text-text-primary">Channel Mix</p><p className="mt-1 text-body-regular text-text-secondary">Share of total spend</p><div className="mt-6 flex h-5 overflow-hidden rounded-full">{data.channels.map((channel,i)=><span key={channel.name} className={["bg-chart-1","bg-chart-2","bg-chart-3","bg-chart-4","bg-chart-5"][i] ?? "bg-background-tertiary-default"} style={{width:`${data.channels.reduce((sum,row)=>sum+row.cost,0) ? channel.cost/data.channels.reduce((sum,row)=>sum+row.cost,0)*100 : 0}%`}} />)}</div><div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{liveChannels.map((c,i)=><div key={c.name} className="flex items-center justify-between gap-4 rounded-xl bg-background-secondary-default px-3 py-2 text-body-medium"><span className="flex items-center gap-2 text-text-secondary"><span className={cx("size-2.5 rounded-full", ["bg-chart-1","bg-chart-2","bg-chart-3","bg-chart-4","bg-chart-5"][i] ?? "bg-background-tertiary-default")} />{c.name}</span><span className="tabular-nums text-text-primary">{c.cost}</span></div>)}</div></article></section>
      <section className="mt-6 rounded-3xl border border-border-button-default bg-background-primary-default shadow-card"><div className="p-5"><h2 className="text-title-3-semibold text-text-primary">Channel Performance</h2></div><DataTable rows={liveChannels} firstLabel="Channel" extended /></section>
      <section className="mt-6 rounded-3xl border border-border-button-default bg-background-primary-default shadow-card"><div className="flex flex-wrap items-end justify-between gap-4 p-5"><div><h2 className="text-title-3-semibold text-text-primary">Brand Keyword Monitor</h2><p className="mt-1 text-body-regular text-text-secondary">Contains “{data.brandFilter}” · Top 3 by conversions + Total Brand · Delta vs {comparison}</p></div><div className="flex w-full items-end gap-2 sm:w-auto"><Input label="Filter keyword text" value={brandInput} onChange={setBrandInput} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();applyBrandFilter();}}} maxLength={50} isDisabled={isLoading} leadingIcon={RiSearchLine} placeholder="blu" className="min-w-0 flex-1 sm:w-64" /><Button onClick={applyBrandFilter} disabled={isLoading}>Apply</Button></div></div>{data.brandKeywords.length?<BrandKeywordTable rows={data.brandKeywords}/>:<p className="px-5 pb-5 text-body-regular text-text-secondary">No matching brand keyword activity in this period.</p>}</section>
      <section className="mt-6 rounded-3xl border border-border-button-default bg-background-primary-default shadow-card"><div className="flex flex-wrap items-end justify-between gap-4 p-5"><div><h2 className="text-title-3-semibold text-text-primary">Top 5 Non-Brand Search Terms</h2><p className="mt-1 text-body-regular text-text-secondary">{searchTermSort.endsWith("_movers")?`Largest ${searchTermSort==="spend_movers"?"spend":"conversion"} changes vs ${comparison}`:`Ranked by ${searchTermSort}`}</p></div><div><p className="mb-1.5 text-caption-1-semibold text-text-secondary">Sort by</p><div className="flex flex-wrap rounded-2lg bg-background-secondary-default p-1">{(["spend","conversions","spend_movers","conversion_movers"] as const).map(value=><button key={value} disabled={isLoading} onClick={()=>changeSearchTermSort(value)} className={cx("rounded-lg px-4 py-1.5 text-body-medium",searchTermSort===value?"bg-background-primary-default text-text-primary shadow-card":"text-text-secondary")}>{value==="spend"?"Spend":value==="conversions"?"Conversions":value==="spend_movers"?"Spend Movers":"Conversion Movers"}</button>)}</div></div></div><DataTable rows={liveSearches} firstLabel="Search term" extended showImpressionShare={false} changeLabel={searchTermSort==="spend_movers"?"Spend":searchTermSort==="conversion_movers"?"Conversions":undefined} /></section>
      <section className="mt-6 rounded-3xl border border-border-button-default bg-background-primary-default shadow-card"><div className="p-5"><h2 className="text-title-3-semibold text-text-primary">Top 5 Products</h2><p className="mt-1 text-body-regular text-text-secondary">Ranked by conversions · Product title and SKU</p></div>{data.products.length?<div className="overflow-x-auto"><table className="w-full min-w-[1080px] border-collapse"><thead><tr className="border-b border-border-table text-left text-caption-1-semibold text-text-tertiary"><th className="px-4 py-3">Product</th>{["Cost","Conv. value","ROAS","Conversions","Impressions","Clicks","CTR","CVR","CPA","AOV"].map(label=><th key={label} className="px-4 py-3 text-right">{label}</th>)}</tr></thead><tbody>{data.products.map(product=><tr key={product.sku} className="border-b border-border-table last:border-0 hover:bg-background-primary-hover"><td className="px-4 py-3"><div className="flex min-w-96 items-center gap-4"><ProductImage src={product.imageUrl} name={product.name} /><div className="min-w-0"><p className="text-body-medium text-text-primary">{product.name}</p><div className="mt-1 flex items-center gap-1.5"><span className="break-all text-caption-2-regular text-text-tertiary">SKU: {product.sku}</span><Button iconOnly size="xs" variant="ghost" leadingIcon={copiedSku===product.sku?RiCheckLine:RiFileCopyLine} onClick={()=>copySku(product.sku)} aria-label={`Copy SKU ${product.sku}`} title={copiedSku===product.sku?"Copied":"Copy SKU"} /></div></div></div></td>{[currency.format(product.cost),currency.format(product.revenue),product.roas==null?"—":product.roas.toFixed(2),number.format(product.conversions),compact.format(product.impressions),compact.format(product.clicks),product.ctr==null?"—":`${(product.ctr*100).toFixed(2)}%`,product.clicks?`${(product.conversions/product.clicks*100).toFixed(2)}%`:"—",product.conversions?currency.format(product.cost/product.conversions):"—",product.conversions?currency.format(product.revenue/product.conversions):"—"].map((value,index)=><td key={index} className="px-4 py-3 text-right text-body-regular tabular-nums text-text-secondary">{value}</td>)}</tr>)}</tbody></table></div>:<p className="px-5 pb-5 text-body-regular text-text-secondary">No product activity in this period.</p>}</section>
      <footer className="py-8 text-center text-caption-2-regular text-text-tertiary">Live from Supabase · Account {data.customerId} · Updated through {formatDate(data.latestDate)}</footer>
    </div></main>
  </div>;
}
