"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import TestingLink from "./testing-link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dialog } from "radix-ui";
import { Archive, ChevronLeft, ChevronRight, FlaskConical, LayoutDashboard, Menu, PanelLeft, X } from "lucide-react";
import type { TestingInventory, TestingInventoryChannel } from "@/lib/testing-inventory-model";
import { configuredTestingCampaignCount } from "@/lib/testing-campaign-counts";
import { concludedCampaignCount } from "@/lib/concluded-tests";
import { TestingChannelBrand } from "./testing-channel-brand";
import { isConcludedTestingNavigation } from "@/lib/testing-navigation";
import { CampaignNavigator } from "./campaign-navigator";
import { TestingDataRefresh, testingRefreshChannel } from "./testing-data-refresh";
import { useTestingPageAiScope, useTestingSidebarState } from "./testing-ai";
import { NovaButton } from "./nova-preview-ui";
import { NovaReportingPeriodSelect, NovaReportingPeriodCustom, useNovaPeriodDraft } from "./nova-reporting-period";
import { NovaAskAiButton } from "./nova-ask-ai-button";
import { NovaShareButton } from "./nova-share-button";
import { NovaAccountControls } from "./nova-account-controls";
import { SiteHomeLogo } from "@/components/brand/site-home-logo";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import styles from "./nova-preview-shell.module.css";

const channels = [
  ["Google Search", "/bluevua/testing/google/search", "google-search"],
  ["Google PMAX", "/bluevua/testing/google/pmax", "google-pmax"], ["Google Demand Gen", "/bluevua/testing/google/demand-gen", "google-demand-gen"],
  ["Meta", "/bluevua/testing/meta", "meta"], ["Reddit", "/bluevua/testing/reddit", "reddit"],
  ["EDM", "/bluevua/testing/edm", "edm"], ["Social Media", "/bluevua/testing/social", null],
] as const;
const workspaceLinks = [["Overview","/bluevua/testing",LayoutDashboard],["Test inventory","/bluevua/testing/inventory",FlaskConical]] as const;
const concludedCount = concludedCampaignCount();

function InventoryCount({channel,badge=false}:{channel?:TestingInventoryChannel;badge?:boolean}) {
 const count=configuredTestingCampaignCount(channel);
 return <span className={badge?styles.navBadge:styles.navCount} aria-label={`${count} ${count===1?"campaign":"campaigns"}`}>{count}</span>;
}

export function NovaPreviewShell({children,account}:{children:ReactNode;account:{name:string;email:string;picture?:string}|null;inventory:Promise<TestingInventory>}) {
 const {language}=useSiteLanguage();
 const zh=language==='zh';
 const {collapsed,setCollapsed}=useTestingSidebarState();
 const [menuOpen,setMenuOpen]=useState(false);
 const pathname=usePathname();
 const params=useSearchParams();
 const query=new URLSearchParams();
 for(const key of ["period","start","end"]){const value=params.get(key);if(value)query.set(key,value);}
 const concludedContext=isConcludedTestingNavigation(pathname,params.get("returnTo"));
 const refreshChannel=pathname==="/bluevua/testing/inventory"?null:testingRefreshChannel(pathname,concludedContext);
 const sidebarContent=(compact:boolean,onNavigate?:()=>void)=><>
   <div className={styles.brandRow}>
    <Link href="/bluevua" className={styles.wordmark} aria-label={zh?"Bluevua 项目主页":"Bluevua project home"} onClick={onNavigate}><Image className={styles.brandMark} src="/brand/bluevua-logo.svg" alt="" width={32} height={32} loading={onNavigate?"eager":"lazy"}/>{!compact&&<>Bluevua<b>.</b></>}</Link>
    {!onNavigate&&<NovaButton variant="ghost" size="icon" className={styles.collapse} aria-label={compact?(zh?"展开侧栏":"Expand sidebar"):(zh?"收起侧栏":"Collapse sidebar")} aria-expanded={!compact} onClick={()=>setCollapsed(!compact)}>{compact?<PanelLeft/>:<ChevronLeft/>}</NovaButton>}
    {onNavigate&&<Dialog.Close asChild><NovaButton variant="ghost" size="icon" className={styles.mobileClose} aria-label={zh?"关闭导航":"Close navigation"}><X/></NovaButton></Dialog.Close>}
   </div>
   {!compact&&<p className={styles.navLabel}>{zh?'工作区':'Workspace'}</p>}
   <nav aria-label={zh?'工作区':'Workspace'} className={styles.nav}>
    {workspaceLinks.map(([label,href,Icon])=>{const active=!concludedContext&&pathname===href;const name=zh?(label==='Overview'?'总览':'测试清单'):label;return <TestingLink key={href} href={`${href}${query.size?`?${query}`:""}`} onClick={onNavigate} className={`${styles.navItem} ${active?styles.active:""}`} aria-current={active?"page":undefined} aria-label={name} title={compact?name:undefined}><span className={styles.iconSlot}><Icon/></span>{!compact&&<><span>{name}</span>{label==="Test inventory"&&<InventoryCount badge/>}</>}</TestingLink>;})}
   </nav>
   {!compact&&<p className={`${styles.navLabel} ${styles.channelsLabel}`}>{zh?'渠道':'Channels'}</p>}
   <nav aria-label={zh?"内容测试渠道":"Content testing channels"} className={styles.nav}>{channels.map(([label,href,channel])=>{const active=!concludedContext&&(pathname===href||pathname.startsWith(`${href}/`)||(label==="Google Search"&&pathname==="/bluevua/testing/google"));const displayLabel=label==="Google Demand Gen"?"Demand Gen":label;return <Link key={href} href={`${href}${query.size?`?${query}`:""}`} onClick={onNavigate} className={`${styles.navItem} ${active?styles.active:""}`} aria-current={active?"page":undefined} aria-label={label} title={compact?label:undefined}><span className={styles.iconSlot}><TestingChannelBrand name={label} eager={!!onNavigate}/></span>{!compact&&<><span>{displayLabel}</span>{channel&&<InventoryCount channel={channel}/>}</>}</Link>;})}</nav>
   <div className={styles.concluded}><Link href={`/bluevua/testing/concluded${query.size?`?${query}`:""}`} onClick={onNavigate} className={`${styles.navItem} ${concludedContext?styles.active:""}`} aria-current={concludedContext?"page":undefined} aria-label={zh?`已结束测试，${concludedCount} 个活动`:`Concluded Test, ${concludedCount} ${concludedCount===1?"campaign":"campaigns"}`} title={compact?(zh?'已结束测试':'Concluded Test'):undefined}><span className={styles.iconSlot}><Archive/></span>{!compact&&<><span>{zh?'已结束测试':'Concluded Test'}</span><span className={styles.navCount}>{concludedCount}</span></>}</Link></div>
   {refreshChannel&&(!menuOpen||onNavigate)&&<TestingDataRefresh channel={refreshChannel} collapsed={compact} variant="nova"/>}
 </>;
 return <div className={styles.root}>
  <aside className={`${styles.sidebar} ${collapsed?styles.collapsed:""}`} aria-label={zh?"测试导航":"Testing navigation"}>{sidebarContent(collapsed)}</aside>
  <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
   <Dialog.Portal><Dialog.Overlay className={styles.sheetOverlay}/><Dialog.Content className={styles.mobileSheet}><Dialog.Title className={styles.visuallyHidden}>{zh?"导航":"Navigation"}</Dialog.Title><Dialog.Description className={styles.visuallyHidden}>{zh?"选择渠道或页面。":"Choose a channel or view."}</Dialog.Description>{sidebarContent(false,()=>setMenuOpen(false))}</Dialog.Content></Dialog.Portal>
   <div className={styles.workspace}>
    <header className={styles.topbar}>
     <nav className={styles.topbarBreadcrumb} aria-label={zh?"面包屑导航":"Breadcrumb"}>
      <Dialog.Trigger asChild><NovaButton variant="ghost" size="icon" className={styles.mobileMenu} aria-label={zh?"打开导航":"Open navigation"}><Menu aria-hidden="true"/></NovaButton></Dialog.Trigger>
      <SiteHomeLogo/><Link href="/bluevua">Bluevua</Link><ChevronRight aria-hidden="true"/><Link href={`/bluevua/testing?${query}`}>{zh?"内容测试":"Content testing"}</Link>
     </nav>
     <NovaAccountControls account={account}/>
    </header>
    <main data-testing-content className={styles.main}>{children}</main>
   </div>
  </Dialog.Root>
  <CampaignNavigator variant="nova"/>
 </div>;
}

export function NovaPreviewHeader({sharePeriod}:{sharePeriod:{start:string;end:string}}) {
 const params=useSearchParams(), pathname=usePathname(), router=useRouter(), chat=useTestingPageAiScope();
 const {language}=useSiteLanguage(),zh=language==='zh';
 const [pending,startTransition]=useTransition();
 const {start,end,setStart,setEnd,customDraft,setCustomDraft}=useNovaPeriodDraft(params.get("period"),params.get("start"),params.get("end"));
 const current=customDraft?"custom":params.get("period")??"lastWeek";
 const update=(period:string,range?:{start:string;end:string})=>{const query=new URLSearchParams(params.toString());query.set("period",period);if(period==="custom"&&range){query.set("start",range.start);query.set("end",range.end);}else {query.delete("start");query.delete("end");}startTransition(()=>router.replace(`${pathname}?${query}`,{scroll:false}));};
 return <header data-testing-header className={styles.header}>
  <div><h1>{zh?'内容测试总览':'Content testing overview'}</h1></div>
  <div className={styles.controls}><label className={styles.periodLabel} htmlFor="nova-period">{zh?'报告周期':'Reporting period'}</label><NovaReportingPeriodSelect id="nova-period" ariaLabel={zh?'测试报告周期':'Testing reporting period'} value={current} onValueChange={value=>{if(value==="custom")setCustomDraft(true);else{setCustomDraft(false);update(value);}}} disabled={pending}/>{current==="custom"&&<NovaReportingPeriodCustom zh={zh} start={start} end={end} disabled={pending} onApply={range=>{const next={start:range.start.toString(),end:range.end.toString()};setStart(next.start);setEnd(next.end);update("custom",next);}}/>}<NovaShareButton disabled={pending} period={sharePeriod}/><NovaAskAiButton onClick={()=>chat.isOpen?chat.close():chat.open()} aria-expanded={chat.isOpen} aria-controls="testing-ai-panel">{zh?'询问 AI':'Ask AI'}</NovaAskAiButton></div>
 </header>;
}

export function NovaPreviewLoading(){const {language}=useSiteLanguage();return <div className={styles.loading} role="status">{language==='zh'?'正在加载测试表现…':'Loading testing performance…'}</div>;}
