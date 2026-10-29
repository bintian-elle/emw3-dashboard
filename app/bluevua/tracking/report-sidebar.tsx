"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { ChevronLeft, ChevronRight, Menu, X, type LucideIcon } from "lucide-react";
import styles from "./report-sidebar.module.css";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";

export type ReportNavItem = { href: string; label: string; icon: LucideIcon; active?: boolean; section?: boolean };

export function ReportSidebar({ title, items, updated }: { title: string; items: ReportNavItem[]; updated?: string }) {
  const {language}=useSiteLanguage(),zh=language==='zh';
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);

  function contents(compact: boolean, mobile = false) {
    return <>
      <div className={styles.brandRow}>
        <Link href="/bluevua" className={styles.brand} aria-label={zh?'Bluevua 项目主页':'Bluevua project home'} onClick={() => setOpen(false)}>
          <Image src="/brand/bluevua-logo.svg" width={32} height={32} alt=""/>
          {!compact && <span>Bluevua<b>.</b></span>}
        </Link>
        {mobile
          ? <Dialog.Close className={styles.iconButton} aria-label={zh?'关闭导航':'Close navigation'}><X/></Dialog.Close>
          : <button type="button" className={styles.iconButton} aria-label={collapsed ? (zh?'展开导航':'Expand navigation') : (zh?'收起导航':'Collapse navigation')} aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}>{collapsed ? <ChevronRight/> : <ChevronLeft/>}</button>}
      </div>
      {!compact && <p className={styles.label}>{title}</p>}
      <nav className={styles.nav} aria-label={zh?`${title}导航`:`${title} navigation`}>
        {items.map(({ href, label, icon: Icon, active, section }) => <Link
          key={`${href}-${label}`}
          href={href}
          prefetch={false}
          title={compact ? label : undefined}
          aria-label={label}
          aria-current={active ? (section ? "location" : "page") : undefined}
          className={`${styles.item} ${active ? styles.active : ""}`}
          onClick={() => setOpen(false)}
        ><Icon aria-hidden="true"/>{!compact && <span>{label}</span>}</Link>)}
      </nav>
      {updated && !compact && <p className={styles.updated}>{updated}</p>}
    </>;
  }

  return <>
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>{contents(collapsed)}</aside>
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className={styles.mobileTrigger} aria-label={zh?'打开导航':'Open navigation'}><Menu/></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay}/>
        <Dialog.Content className={styles.sheet}>
          <Dialog.Title className={styles.visuallyHidden}>{zh?`${title}导航`:`${title} navigation`}</Dialog.Title>
          {contents(false, true)}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
}
