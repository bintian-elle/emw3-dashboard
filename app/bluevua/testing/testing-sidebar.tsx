"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { RiDashboardLine, RiMailLine, RiMegaphoneLine, RiRedditLine, RiSearchLine } from "@remixicon/react";
import { SidebarProjectLink } from "@/components/brand/sidebar-project-link";
import { cx } from "@/utils/cx";

const navigation = [
  {label:"Overview",href:"/bluevua/testing",icon:RiDashboardLine},
  {label:"Google",href:"/bluevua/testing/google",icon:RiSearchLine},
  {label:"Meta",href:"/bluevua/testing/meta",icon:RiMegaphoneLine},
  {label:"Reddit",href:"/bluevua/testing/reddit",icon:RiRedditLine},
  {label:"EDM",href:"/bluevua/testing/edm",icon:RiMailLine},
];

export function TestingSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  return <aside className="w-full border-b border-separator-border bg-background-primary-default p-4 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r"><div className="flex h-full flex-col"><SidebarProjectLink reportName="Testing" /><nav className="mt-4 flex gap-1 overflow-x-auto lg:mt-6 lg:flex-col lg:overflow-visible" aria-label="Testing channels">{navigation.map(item=>{const active=item.href==="/bluevua/testing"?pathname===item.href:pathname.startsWith(item.href);const Icon=item.icon;const href=query?`${item.href}?${query}`:item.href;return <Link key={item.href} href={href} className={cx("flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-body-medium",active?"bg-button-ghost-background text-button-ghost-foreground shadow-nav-selected":"text-text-secondary hover:bg-background-primary-hover hover:text-text-primary")}><Icon className="size-5" aria-hidden />{item.label}</Link>})}</nav></div></aside>;
}
