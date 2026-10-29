"use client";

import {useTestingSidebarState} from "./testing-ai";
import {TestingDataRefresh,testingRefreshChannel} from "./testing-data-refresh";
import {isConcludedTestingNavigation} from "@/lib/testing-navigation";
import {concludedCampaignCount} from "@/lib/concluded-tests";
import Link from "next/link";
import { IconButton } from "@/components/base/buttons/icon-button";
import { usePathname, useSearchParams } from "next/navigation";
import { RiSideBarLine, RiArrowLeftSLine, RiArchiveLine, RiDashboardLine, RiInstagramLine, RiMailLine, RiMegaphoneLine, RiRedditLine, RiRocket2Line, RiMovie2Line, RiSearchLine } from "@remixicon/react";
import { LayoutDashboard } from "lucide-react";
import { TestingChannelBrand } from "./testing-channel-brand";
import { SidebarProjectLink } from "@/components/brand/sidebar-project-link";
import { cx } from "@/utils/cx";

const navigation = [
  {label:"Overview",href:"/bluevua/testing",icon:RiDashboardLine},
  {label:"Google Search",href:"/bluevua/testing/google/search",icon:RiSearchLine},
  {label:"Google PMAX",href:"/bluevua/testing/google/pmax",icon:RiRocket2Line},
  {label:"Google Demand Gen",href:"/bluevua/testing/google/demand-gen",icon:RiMovie2Line},
  {label:"Meta",href:"/bluevua/testing/meta",icon:RiMegaphoneLine},
  {label:"Reddit",href:"/bluevua/testing/reddit",icon:RiRedditLine},
  {label:"EDM",href:"/bluevua/testing/edm",icon:RiMailLine},
];

export function TestingSidebar() {
  const {collapsed, setCollapsed} = useTestingSidebarState();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isNovaPreview=(pathname==="/bluevua/testing"||pathname==="/bluevua/testing/")&&searchParams.get("designPreview")==="nova";
  const concludedContext=isConcludedTestingNavigation(pathname,searchParams.get("returnTo"));
  const refreshChannel=testingRefreshChannel(pathname,concludedContext);
  const activePath=concludedContext&&pathname.startsWith("/bluevua/testing/google/")?"/bluevua/testing/concluded/google-search":pathname==="/bluevua/testing/concluded/google"?"/bluevua/testing/concluded/google-search":pathname;
  const navigationParams=new URLSearchParams(searchParams.toString());navigationParams.delete("returnTo");
  const query = navigationParams.toString();
  const performanceNavigation=[...navigation,{label:"Social Media",href:"/bluevua/testing/social",icon:RiInstagramLine}];
  const concludedCount=concludedCampaignCount();
  return <aside className={cx("w-full border-b border-separator-border bg-background-primary-default p-4 lg:sticky lg:top-0 lg:h-[calc(100dvh-4rem)] lg:self-start lg:overflow-hidden lg:shrink-0 lg:border-b-0 lg:border-r motion-safe:transition-[width] motion-safe:duration-200",collapsed?"lg:w-20 lg:p-3":"lg:w-60")}><div className="flex min-h-full flex-col lg:h-full"><div className="relative min-h-9"><div className={cx("w-full min-w-0",collapsed&&"lg:hidden")}><SidebarProjectLink reportName="Testing" /></div><IconButton icon={collapsed?RiSideBarLine:RiArrowLeftSLine} aria-label={collapsed?"Expand sidebar":"Collapse sidebar"} aria-expanded={!collapsed} title={collapsed?"Expand sidebar":"Collapse sidebar"} onClick={()=>setCollapsed(!collapsed)} className="absolute right-0 top-0 hidden lg:inline-flex" /></div><div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-y-contain"><nav className="mt-4 flex gap-1 overflow-x-auto lg:mt-6 lg:flex-col lg:overflow-visible" aria-label="Testing channels">{performanceNavigation.map(item=>{const active=!concludedContext&&(item.href==="/bluevua/testing"?activePath===item.href:(activePath.startsWith(item.href)||(item.label==="Google Search"&&activePath==="/bluevua/testing/google")));const Icon=isNovaPreview&&item.label==="Overview"?LayoutDashboard:item.icon;const href=query?`${item.href}?${query}`:item.href;return <Link key={item.href} href={href} aria-label={item.label} title={collapsed?item.label:undefined} aria-current={active?"page":undefined} className={cx("flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-body-medium",active?"bg-button-ghost-background text-button-ghost-foreground shadow-nav-selected":"text-text-secondary hover:bg-background-primary-hover hover:text-text-primary")}>{isNovaPreview&&item.label!=="Overview"?<TestingChannelBrand name={item.label}/>:<Icon className="size-5 shrink-0" aria-hidden />}<span className={cx(collapsed&&"lg:sr-only")}>{item.label}</span></Link>})}</nav><div className="mt-6 border-t border-separator-border pt-4"><Link href={query?`/bluevua/testing/concluded?${query}`:"/bluevua/testing/concluded"} aria-label={`Concluded Test, ${concludedCount} ${concludedCount===1?"campaign":"campaigns"}`} aria-current={concludedContext?"page":undefined} title={collapsed?"Concluded Test":undefined} className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-medium outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",concludedContext?"bg-button-ghost-background text-button-ghost-foreground shadow-nav-selected":"text-text-secondary hover:bg-background-primary-hover hover:text-text-primary",collapsed&&"lg:justify-center")}><RiArchiveLine className="size-5 shrink-0" aria-hidden/><span className={cx(collapsed&&"lg:sr-only")}>Concluded Test</span><span className={cx("ml-auto tabular-nums text-caption-1-regular",collapsed&&"lg:hidden")}>{concludedCount}</span></Link></div></div>{refreshChannel&&<TestingDataRefresh channel={refreshChannel} collapsed={collapsed}/>}</div></aside>;
}
