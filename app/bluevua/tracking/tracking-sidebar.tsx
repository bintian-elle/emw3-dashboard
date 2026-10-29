"use client";

import { useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart3, BookOpen, MousePointer2, ShoppingBag, LayoutDashboard } from "lucide-react";
import { trackingPeriod } from "@/lib/website-tracking";
import { trackingPages, trackingPageScope, trackingPageHref } from "@/lib/website-tracking-pages";
import { ReportSidebar } from "./report-sidebar";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import { pageNamesZh } from "./labels";

const navigation = [
  { id: "site-overview", label: "Website totals", icon: LayoutDashboard },
  { id: "checkout-results", label: "Checkout & purchases", icon: ShoppingBag },
  { id: "all-events", label: "All events", icon: MousePointer2 },
  { id: "definitions", label: "Definitions", icon: BookOpen },
];
const subscribe = (onChange: () => void) => { window.addEventListener("hashchange", onChange); return () => window.removeEventListener("hashchange", onChange); };
const snapshot = () => window.location.hash.slice(1) || "overview";
const serverSnapshot = () => "overview";

export function TrackingSidebar() {
  const {language}=useSiteLanguage(),zh=language==='zh';
  const query = useSearchParams();
  let period = trackingPeriod({});
  try { period = trackingPeriod({ start: query.get("start") ?? undefined, end: query.get("end") ?? undefined }); } catch {}
  const page = query.get("page") ?? "collection", device = query.get("device") ?? "all";
  const activeId = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const pageItems = trackingPages.filter(item => item.id !== "checkout").map(item => ({
    label: zh?pageNamesZh[item.id]:item.label, href: trackingPageHref(period, device, trackingPageScope(item.id)), icon: BarChart3, active: page === item.id,
  }));
  const sectionLabels:Record<string,string>={'site-overview':'网站汇总','checkout-results':'结账与购买','all-events':'全部事件',definitions:'定义说明'};
  const sectionItems = navigation.map(({ id, ...item }) => ({ ...item, label:zh?sectionLabels[id]:item.label, href: `#${id}`, active: activeId === id, section: true }));
  return <ReportSidebar title={zh?'网站追踪':'Website Tracking'} items={[...pageItems, ...sectionItems]}/>;
}
