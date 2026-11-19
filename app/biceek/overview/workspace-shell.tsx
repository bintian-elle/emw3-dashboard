"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChartColumnIncreasing, ChartPie, ChevronLeft, ChevronRight, Flag, Languages, Menu, PanelLeft, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { DashboardTopBar } from "@/components/application/dashboard/dashboard-top-bar";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import { NovaButton } from "@/app/bluevua/testing/nova-preview-ui";
import styles from "@/app/bluevua/testing/nova-preview-shell.module.css";
import chat from "@/app/bluevua/testing/nova-chat.module.css";
import layout from "./market-overview.module.css";
import { AskDockContext, askDockNarrow, subscribeAskDockNarrow } from "./ask-dock";
import { MarketRefresh, useMarketRefresh } from "./market-refresh";
import type { SiteUser } from "@/lib/site-auth";

export type BiceekView = "overview" | "united-kingdom" | "market-comparison" | "localization-review";

export function BiceekWorkspace({ account, updatedAt, children, view }: { view: BiceekView; account: SiteUser | null; updatedAt: string | null; children: ReactNode }) {
  const { language } = useSiteLanguage();
  const zh = language === "zh";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [askSlot, setAskSlot] = useState<HTMLDivElement | null>(null);
  const [topbarHeight, setTopbarHeight] = useState(60);
  const [askWidth, setAskWidth] = useState(640);
  const topbar = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = topbar.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setTopbarHeight(entry.contentRect.height));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const narrow = useSyncExternalStore(subscribeAskDockNarrow, askDockNarrow, () => true);
  const docked = askOpen && !narrow;
  const content = useRef<HTMLDivElement>(null);
  const scroll = useRef(0);
  const wasDocked = useRef(false);
  function setAsk(open: boolean) {
    if (open && !docked) scroll.current = window.scrollY;
    setAskOpen(open);
  }
  useLayoutEffect(() => {
    if (docked && !wasDocked.current && content.current) content.current.scrollTop = scroll.current;
    else if (!docked && wasDocked.current) window.scrollTo({ top: scroll.current, behavior: "instant" });
    wasDocked.current = docked;
  }, [docked]);
  const refresh = useMarketRefresh(updatedAt);
  const links = [
    { id: "overview", href: "/biceek/overview", label: zh ? "总览" : "Overview", Icon: ChartPie },
    { id: "united-kingdom", href: "/biceek/overview/united-kingdom", label: zh ? "英国市场" : "United Kingdom", Icon: Flag },
    { id: "market-comparison", href: "/biceek/overview/market-comparison", label: zh ? "七国市场对比" : "7-market comparison", Icon: ChartColumnIncreasing },
    { id: "localization-review", href: "/biceek/overview/localization-review", label: zh ? "11 月 13 日本地化复盘" : "Nov 13 Localization review", Icon: Languages },
  ];
  const current = links.find(link => link.id === view);
  const sidebar = (compact: boolean, mobile = false) => <>
    <div className={styles.brandRow}>
      <Link href="/biceek" className={styles.wordmark} aria-label={zh ? "Biceek 项目主页" : "Biceek workspace"} onClick={() => setMobileOpen(false)}>
        <Image className={styles.brandMark} src="/brand/biceek-icon.svg" alt="" width={32} height={32} />
        {!compact && "Biceek"}
      </Link>
      {mobile ? <Dialog.Close asChild><NovaButton variant="ghost" size="icon" className={styles.mobileClose} aria-label={zh ? "关闭导航" : "Close navigation"}><X /></NovaButton></Dialog.Close>
        : <NovaButton variant="ghost" size="icon" className={styles.collapse} aria-label={collapsed ? (zh ? "展开侧栏" : "Expand sidebar") : (zh ? "收起侧栏" : "Collapse sidebar")} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeft /> : <ChevronLeft />}</NovaButton>}
    </div>
    <div className={styles.defaultNavigation}>
      {!compact && <p className={styles.navLabel}>{zh ? "工作区" : "Workspace"}</p>}
      <nav className={styles.nav} aria-label={zh ? "工作区" : "Workspace"}>
        {links.map(({ id, href, label, Icon }) => <Link key={id} href={href} aria-label={label} title={compact ? label : undefined} aria-current={view === id ? "page" : undefined}
          className={`${styles.navItem} ${view === id ? styles.active : ""}`} onClick={() => setMobileOpen(false)}>
          <span className={styles.iconSlot}><Icon aria-hidden="true" /></span>{!compact && <span>{label}</span>}
        </Link>)}
      </nav>
    </div>
    <MarketRefresh collapsed={compact} state={refresh} />
  </>;
  return <AskDockContext.Provider value={{ open: askOpen, setOpen: setAsk, docked, slot: askSlot, topbarHeight, width: askWidth, resize: width => setAskWidth(Math.min(840, Math.max(352, width))) }}>
    <div className={`${styles.root} ${docked ? layout.askDockRoot : ""}`}>
    <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
      <div ref={topbar}><DashboardTopBar account={account}>
        <nav className={styles.topbarBreadcrumb} aria-label={zh ? "面包屑导航" : "Breadcrumb"}>
          <Dialog.Trigger asChild><NovaButton variant="ghost" size="icon" className={styles.mobileMenu} aria-label={zh ? "打开导航" : "Open navigation"}><Menu aria-hidden="true" /></NovaButton></Dialog.Trigger>
          <ChevronRight aria-hidden="true" /><span aria-current="page">{current?.label}</span>
        </nav>
      </DashboardTopBar></div>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.sheetOverlay} />
        <Dialog.Content className={styles.mobileSheet}>
          <Dialog.Title className={styles.visuallyHidden}>{zh ? "工作区导航" : "Workspace navigation"}</Dialog.Title>
          <Dialog.Description className={styles.visuallyHidden}>{zh ? "选择报表区块。" : "Choose a report section."}</Dialog.Description>
          {sidebar(false, true)}
        </Dialog.Content>
      </Dialog.Portal>
      <div className={docked ? `${chat.dockedLayout} ${collapsed ? chat.dockedCollapsed : ""} ${layout.askDockLayout}` : undefined}
        style={docked ? { "--testing-chat-width": `${askWidth}px` } as CSSProperties : undefined}>
        <div ref={content} className={docked ? `${chat.dockedContent} ${layout.askDockContent}` : undefined}
          onScroll={docked ? event => { scroll.current = event.currentTarget.scrollTop; } : undefined}>
          <div className={styles.workspaceBody}>
            <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`} aria-label={zh ? "Biceek 导航" : "Biceek navigation"}>{sidebar(collapsed)}</aside>
            <div className={styles.workspace}><main id="overview" className={styles.main}>{children}</main></div>
          </div>
        </div>
        <div ref={setAskSlot} className={layout.askDockSlot} hidden={!docked} />
      </div>
    </Dialog.Root>
    </div>
  </AskDockContext.Provider>;
}
