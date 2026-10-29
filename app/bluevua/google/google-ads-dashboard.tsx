"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown as RiArrowDownLine, ArrowUp as RiArrowUpLine, CalendarDays as RiCalendarLine, Check as RiCheckLine, Copy as RiFileCopyLine, LayoutDashboard as RiHome5Line, Layers as RiMegaphoneLine, Menu as RiMenuLine, Search as RiSearchLine, ShoppingBag as RiShoppingBag3Line, ChevronLeft, PanelLeft, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select, SelectItem } from "@/components/base/select/select";
import { DateRangePicker, type DateRangeValue } from "@/components/base/date-picker/date-range-picker";
import { parseDate } from "@internationalized/date";
import { cx } from "@/utils/cx";
import type { BrandKeywordRow, DashboardMetric, DashboardRow, GoogleAdsDashboardData } from "@/lib/google-ads-types";
import styles from "./google-ads-dashboard.module.css";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";

type Row = { name: string; cost: string; revenue: string; roas: string; conversions: string; impressions: string; clicks: string; ctr: string; cvr: string; cpa: string; aov: string; impressionShare: string; delta: number|null; absChange:number|null };
const nav = [{ label: "Overview", href: "#overview" }, { label: "Channel performance", href: "#channel-performance" }];

function Delta({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  const {language}=useSiteLanguage();
  if (value == null) return <span className="rounded-full bg-background-secondary-default px-2 py-1 text-caption-1-semibold text-text-tertiary">{language==='zh'?'无历史数据':'No prior data'}</span>;
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
  const {language}=useSiteLanguage();
  const positive=delta!=null&&(inverse?delta<=0:delta>=0); const Icon=(delta??0)>=0?RiArrowUpLine:RiArrowDownLine;
  const deltaLabel=delta!=null&&Math.abs(delta)>999?">999%":`${Math.abs(delta??0).toFixed(1)}%`;
  return <span className="inline-flex items-start justify-end gap-1.5 whitespace-nowrap"><span>{value}</span>{delta==null?<sup title={language==='zh'?'对比周期无数据':'No activity in the comparison period'} className="rounded-full bg-background-tertiary-default px-1.5 py-0.5 text-caption-2-semibold text-text-secondary">{language==='zh'?'新增':'NEW'}</sup>:<sup className={cx("inline-flex items-center text-caption-2-semibold",positive?"text-state-success-text":"text-text-error-primary")}><Icon className="size-3" />{deltaLabel}</sup>}</span>;
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
const periodLabelsZh: Record<PeriodPreset,string> = { last7:"最近 7 天",last14:"最近 14 天",last30:"最近 30 天",thisMonth:"本月",lastMonth:"上月",qtd:"本季度至今",ytd:"今年至今",custom:"自定义" };
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
  const { language } = useSiteLanguage();
  const t = (en: string, zh: string) => language === "zh" ? zh : en;
  const [data, setData] = useState(initialData);
  const [comparison, setComparison] = useState(initialData.comparison.mode);
  const [period, setPeriod] = useState<PeriodPreset>("last30");
  const [customRange, setCustomRange] = useState<DateRangeValue>({ start: parseDate(initialData.range.start), end: parseDate(initialData.range.end) });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState("#overview");
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

  const sidebar = (compact: boolean, mobile = false) => <>
    <div className={styles.brandRow}><Link href="/bluevua" className={styles.brand} aria-label="Bluevua project home" onClick={() => mobile && setMobileNav(false)}><Image src="/brand/bluevua-logo.svg" alt="" width={32} height={32} />{!compact && <span>Bluevua<span className={styles.brandDot}>.</span></span>}</Link>{mobile ? <Dialog.Close className={styles.iconButton} aria-label="Close navigation"><X /></Dialog.Close> : <button className={styles.iconButton} onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed}>{collapsed ? <PanelLeft /> : <ChevronLeft />}</button>}</div>
    {!compact && <p className={styles.navLabel}>Google Ads</p>}
    <nav className={styles.nav} aria-label="Dashboard sections">{nav.map((item,i) => { const Icon=icons[i]; return <a key={item.label} href={item.href} className={cx(styles.navItem, activeSection === item.href && styles.navActive)} aria-current={activeSection === item.href ? "location" : undefined} title={compact ? (item.label === "Overview" ? t("Overview", "总览") : t("Channel performance", "渠道表现")) : undefined} onClick={() => { setActiveSection(item.href); if (mobile) setMobileNav(false); }}><Icon aria-hidden="true" />{!compact && <span>{item.label === "Overview" ? t("Overview", "总览") : t("Channel performance", "渠道表现")}</span>}</a>})}</nav>
    {!compact && <div className={styles.update}>{t("Data updated", "数据更新于")} {formatDate(data.latestDate)} · 5:00 AM ET</div>}
  </>;

  return <Dialog.Root open={mobileNav} onOpenChange={setMobileNav}><div className={styles.root}>
    <aside className={cx(styles.sidebar, collapsed && styles.collapsed)} aria-label="Google Ads navigation">{sidebar(collapsed)}</aside>
    <Dialog.Portal><Dialog.Overlay className={styles.overlay}/><Dialog.Content className={styles.drawer}><Dialog.Title className={styles.srOnly}>Google Ads navigation</Dialog.Title><Dialog.Description className={styles.srOnly}>Navigate the dashboard.</Dialog.Description>{sidebar(false, true)}</Dialog.Content></Dialog.Portal>
    <main className={styles.main} id="overview"><div className={styles.content}>
      <header className={styles.header}><Dialog.Trigger className={cx(styles.iconButton, styles.mobileMenu)} aria-label={t("Open navigation", "打开导航")}><RiMenuLine /></Dialog.Trigger><h1>{t('Google Ads Performance','Google Ads 表现')}</h1></header>
      <section className="mb-6 flex flex-wrap items-end gap-3 rounded-3xl border border-border-button-default bg-background-primary-default p-4 shadow-card"><div className="min-w-52 flex-1 sm:flex-none"><label className="mb-1.5 block text-caption-1-semibold text-text-secondary">{t('Reporting period','报告周期')}</label><Select selectedKey={period} isDisabled={isLoading} popoverClassName="overflow-visible" listBoxStyle={{maxHeight:"none",overflow:"visible"}} onSelectionChange={k => { const next=String(k) as PeriodPreset; setPeriod(next); if(next!=="custom") refresh(next,comparison); }} aria-label={t("Reporting period", "报告周期")}><SelectItem id="last7">{t('Last 7 Days','最近 7 天')}</SelectItem><SelectItem id="last14">{t('Last 14 Days','最近 14 天')}</SelectItem><SelectItem id="last30">{t('Last 30 Days','最近 30 天')}</SelectItem><SelectItem id="thisMonth">{t('This Month','本月')}</SelectItem><SelectItem id="lastMonth">{t('Last Month','上月')}</SelectItem><SelectItem id="qtd">{t('Quarter to Date','本季度至今')}</SelectItem><SelectItem id="ytd">{t('Year to Date','本年至今')}</SelectItem><SelectItem id="custom">{t('Custom','自定义')}</SelectItem></Select></div>{period==="custom"&&<div><label className="mb-1.5 block text-caption-1-semibold text-text-secondary">{t('Custom range','自定义日期')}</label><DateRangePicker value={customRange} isDisabled={isLoading} aria-label={t("Custom reporting period", "自定义报告周期")} onChange={value=>{if(!value)return;setCustomRange(value);refresh("custom",comparison,value);}} /></div>}<div><label className="mb-1.5 block text-caption-1-semibold text-text-secondary">{t('Comparison','对比')}</label><div className="flex rounded-2lg bg-background-secondary-default p-1">{(["POP","YOY"] as const).map(v=><button key={v} disabled={isLoading} onClick={()=>{setComparison(v);refresh(period,v,period==="custom"?customRange:undefined);}} className={cx("rounded-lg px-4 py-1.5 text-body-medium", comparison===v ? "bg-background-primary-default text-text-primary shadow-card" : "text-text-secondary")}>{v}</button>)}</div></div><div className="ml-auto hidden items-center gap-2 text-body-regular text-text-secondary sm:flex"><RiCalendarLine className="size-4" /> {formatDate(data.range.start)} – {formatDate(data.range.end)}{isLoading && <span className="agent-progress-loading-text">{t('Refreshing','正在刷新')}</span>}</div></section>
      {error && <div role="alert" className="mb-6 rounded-2xl border border-border-error-default bg-background-tertiary-error p-4 text-body-medium text-text-error-primary">{language==='zh'?'实时数据刷新失败，请重试。':error}</div>}
      <section><div className="mb-4 flex items-end justify-between"><div><p className="text-caption-1-semibold text-text-tertiary">{language==='zh'?periodLabelsZh[period]:periodLabels[period]} · {t('VS','对比')} {comparison}</p><h2 className="mt-1 text-title-2-semibold text-text-primary">{t('Overall Performance','整体表现')}</h2></div><span className="text-body-medium text-state-success-text">{t('Live Data','实时数据')}</span></div><div className={cx("grid grid-cols-2 gap-3 transition-opacity md:grid-cols-4 xl:grid-cols-6",isLoading&&"opacity-60")}>{data.metrics.map(m=><article key={m.label} className="min-w-0 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-card"><p className="text-body-medium text-text-secondary">{m.label}</p><div className="mt-3 grid justify-items-start gap-2"><p className="text-title-1-medium tabular-nums text-text-primary">{formatMetric(m)}</p><Delta value={m.delta} inverse={m.inverse} /></div></article>)}</div></section>
      <section className="mt-6"><article className="rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-card"><p className="text-title-3-semibold text-text-primary">{t('Channel Mix','渠道构成')}</p><p className="mt-1 text-body-regular text-text-secondary">{t('Share of total spend','总支出占比')}</p><div className="mt-6 flex h-5 overflow-hidden rounded-full">{data.channels.map((channel,i)=><span key={channel.name} className={["bg-chart-1","bg-chart-2","bg-chart-3","bg-chart-4","bg-chart-5"][i] ?? "bg-background-tertiary-default"} style={{width:`${data.channels.reduce((sum,row)=>sum+row.cost,0) ? channel.cost/data.channels.reduce((sum,row)=>sum+row.cost,0)*100 : 0}%`}} />)}</div><div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{liveChannels.map((c,i)=><div key={c.name} className="flex items-center justify-between gap-4 rounded-xl bg-background-secondary-default px-3 py-2 text-body-medium"><span className="flex items-center gap-2 text-text-secondary"><span className={cx("size-2.5 rounded-full", ["bg-chart-1","bg-chart-2","bg-chart-3","bg-chart-4","bg-chart-5"][i] ?? "bg-background-tertiary-default")} />{c.name}</span><span className="tabular-nums text-text-primary">{c.cost}</span></div>)}</div></article></section>
      <section id="channel-performance" className="mt-6 rounded-3xl border border-border-button-default bg-background-primary-default shadow-card"><div className="p-5"><h2 className="text-title-3-semibold text-text-primary">{t('Channel Performance','渠道表现')}</h2></div><DataTable rows={liveChannels} firstLabel={t("Channel", "渠道")} extended /></section>
      <section className="mt-6 rounded-3xl border border-border-button-default bg-background-primary-default shadow-card"><div className="flex flex-wrap items-end justify-between gap-4 p-5"><div><h2 className="text-title-3-semibold text-text-primary">{t('Brand Keyword Monitor','品牌关键词监测')}</h2><p className="mt-1 text-body-regular text-text-secondary">Contains “{data.brandFilter}” · Top 3 by conversions + Total Brand · Delta vs {comparison}</p></div><div className="flex w-full items-end gap-2 sm:w-auto"><Input label={t("Filter keyword text", "筛选关键词")} value={brandInput} onChange={setBrandInput} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();applyBrandFilter();}}} maxLength={50} isDisabled={isLoading} leadingIcon={RiSearchLine} placeholder="blu" className="min-w-0 flex-1 sm:w-64" /><Button onClick={applyBrandFilter} disabled={isLoading}>{t('Apply','应用')}</Button></div></div>{data.brandKeywords.length?<BrandKeywordTable rows={data.brandKeywords}/>:<p className="px-5 pb-5 text-body-regular text-text-secondary">{t('No matching brand keyword activity in this period.','此周期没有匹配的品牌关键词数据。')}</p>}</section>
      <section className="mt-6 rounded-3xl border border-border-button-default bg-background-primary-default shadow-card"><div className="flex flex-wrap items-end justify-between gap-4 p-5"><div><h2 className="text-title-3-semibold text-text-primary">{t('Top 5 Non-Brand Search Terms','前 5 个非品牌搜索词')}</h2><p className="mt-1 text-body-regular text-text-secondary">{searchTermSort.endsWith("_movers")?`Largest ${searchTermSort==="spend_movers"?"spend":"conversion"} changes vs ${comparison}`:`Ranked by ${searchTermSort}`}</p></div><div><p className="mb-1.5 text-caption-1-semibold text-text-secondary">{t('Sort by','排序方式')}</p><div className="flex flex-wrap rounded-2lg bg-background-secondary-default p-1">{(["spend","conversions","spend_movers","conversion_movers"] as const).map(value=><button key={value} disabled={isLoading} onClick={()=>changeSearchTermSort(value)} className={cx("rounded-lg px-4 py-1.5 text-body-medium",searchTermSort===value?"bg-background-primary-default text-text-primary shadow-card":"text-text-secondary")}>{value==="spend"?"Spend":value==="conversions"?"Conversions":value==="spend_movers"?"Spend Movers":"Conversion Movers"}</button>)}</div></div></div><DataTable rows={liveSearches} firstLabel={t("Search term", "搜索词")} extended showImpressionShare={false} changeLabel={searchTermSort==="spend_movers"?"Spend":searchTermSort==="conversion_movers"?"Conversions":undefined} /></section>
      <section className="mt-6 rounded-3xl border border-border-button-default bg-background-primary-default shadow-card"><div className="p-5"><h2 className="text-title-3-semibold text-text-primary">{t('Top 5 Products','前 5 个产品')}</h2><p className="mt-1 text-body-regular text-text-secondary">{t('Ranked by conversions · Product title and SKU','按转化次数排序 · 产品名称和 SKU')}</p></div>{data.products.length?<div className="overflow-x-auto"><table className="w-full min-w-[1080px] border-collapse"><thead><tr className="border-b border-border-table text-left text-caption-1-semibold text-text-tertiary"><th className="px-4 py-3">{t('Product','产品')}</th>{["Cost","Conv. value","ROAS","Conversions","Impressions","Clicks","CTR","CVR","CPA","AOV"].map(label=><th key={label} className="px-4 py-3 text-right">{label}</th>)}</tr></thead><tbody>{data.products.map(product=><tr key={product.sku} className="border-b border-border-table last:border-0 hover:bg-background-primary-hover"><td className="px-4 py-3"><div className="flex min-w-96 items-center gap-4"><ProductImage src={product.imageUrl} name={product.name} /><div className="min-w-0"><p className="text-body-medium text-text-primary">{product.name}</p><div className="mt-1 flex items-center gap-1.5"><span className="break-all text-caption-2-regular text-text-tertiary">SKU: {product.sku}</span><Button iconOnly size="xs" variant="ghost" leadingIcon={copiedSku===product.sku?RiCheckLine:RiFileCopyLine} onClick={()=>copySku(product.sku)} aria-label={`Copy SKU ${product.sku}`} title={copiedSku===product.sku?"Copied":"Copy SKU"} /></div></div></div></td>{[currency.format(product.cost),currency.format(product.revenue),product.roas==null?"—":product.roas.toFixed(2),number.format(product.conversions),compact.format(product.impressions),compact.format(product.clicks),product.ctr==null?"—":`${(product.ctr*100).toFixed(2)}%`,product.clicks?`${(product.conversions/product.clicks*100).toFixed(2)}%`:"—",product.conversions?currency.format(product.cost/product.conversions):"—",product.conversions?currency.format(product.revenue/product.conversions):"—"].map((value,index)=><td key={index} className="px-4 py-3 text-right text-body-regular tabular-nums text-text-secondary">{value}</td>)}</tr>)}</tbody></table></div>:<p className="px-5 pb-5 text-body-regular text-text-secondary">{t('No product activity in this period.','此周期没有产品数据。')}</p>}</section>
      <footer className="py-8 text-center text-caption-2-regular text-text-tertiary">Live from Supabase · Account {data.customerId} · Updated through {formatDate(data.latestDate)}</footer>
    </div></main>
  </div></Dialog.Root>;
}
