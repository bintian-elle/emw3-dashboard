"use client";

import {isConcludedTestingNavigation} from "@/lib/testing-navigation";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { usePathname, useSearchParams } from "next/navigation";
import { RiArchiveLine, RiArrowDownSLine, RiArrowRightSLine, RiDashboardLine, RiInstagramLine, RiMailLine, RiMegaphoneLine, RiRedditLine, RiRocket2Line, RiMovie2Line, RiSearchLine } from "@remixicon/react";
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
  const [concludedOpen, setConcludedOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const concludedContext=isConcludedTestingNavigation(pathname,searchParams.get("returnTo"));
  const activePath=concludedContext&&pathname.startsWith("/bluevua/testing/google/")?"/bluevua/testing/concluded/google-search":pathname==="/bluevua/testing/concluded/google"?"/bluevua/testing/concluded/google-search":pathname;
  const navigationParams=new URLSearchParams(searchParams.toString());navigationParams.delete("returnTo");
  const query = navigationParams.toString();
  const performanceNavigation=[...navigation,{label:"Social Media",href:"/bluevua/testing/social",icon:RiInstagramLine}];
  return <aside className="w-full border-b border-separator-border bg-background-primary-default p-4 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r"><div className="flex h-full flex-col"><SidebarProjectLink reportName="Testing" /><nav className="mt-4 flex gap-1 overflow-x-auto lg:mt-6 lg:flex-col lg:overflow-visible" aria-label="Testing channels">{performanceNavigation.map(item=>{const active=!concludedContext&&(item.href==="/bluevua/testing"?activePath===item.href:(activePath.startsWith(item.href)||(item.label==="Google Search"&&activePath==="/bluevua/testing/google")));const Icon=item.icon;const href=query?`${item.href}?${query}`:item.href;return <Link key={item.href} href={href} aria-current={active?"page":undefined} className={cx("flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-body-medium",active?"bg-button-ghost-background text-button-ghost-foreground shadow-nav-selected":"text-text-secondary hover:bg-background-primary-hover hover:text-text-primary")}><Icon className="size-5" aria-hidden />{item.label}</Link>})}</nav><div className="mt-6 border-t border-separator-border pt-4"><Button variant="ghost" leadingIcon={RiArchiveLine} trailingIcon={concludedOpen ? RiArrowDownSLine : RiArrowRightSLine} aria-expanded={concludedOpen} aria-controls="concluded-test-navigation" onClick={() => setConcludedOpen(open => !open)} className="h-auto w-full justify-start gap-3 rounded-xl bg-transparent px-3 py-2.5 text-text-secondary shadow-none hover:bg-background-primary-hover hover:text-text-primary">Concluded Test</Button><nav id="concluded-test-navigation" hidden={!concludedOpen} aria-label="Concluded tests" className="mt-2 space-y-1 pl-3">{navigation.map(item => {const href=item.href==="/bluevua/testing"?"/bluevua/testing/concluded":`/bluevua/testing/concluded/${item.label.toLowerCase().replaceAll(" ","-")}`;const active=activePath===href;const Icon=item.icon;return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-medium outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring", active ? "bg-button-ghost-background text-button-ghost-foreground shadow-nav-selected" : "text-text-secondary hover:bg-background-primary-hover hover:text-text-primary")}><Icon className="size-5" aria-hidden />{item.label}</Link>})}</nav></div></div></aside>;
}
