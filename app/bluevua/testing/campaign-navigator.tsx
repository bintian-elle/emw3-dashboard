"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { RiArrowLeftSLine, RiArrowRightSLine, RiArrowUpLine } from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Select, SelectItem } from "@/components/base/select/select";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";

type CampaignEntry = { id: string; name: string; channel: string };
function campaignElement(id: string) {
  const marker = document.getElementById(id);
  return marker?.closest<HTMLElement>("article, section") ?? marker;
}
function headerOffset() {
  return (document.querySelector("[data-testing-header]")?.getBoundingClientRect().height ?? 0) + 16;
}
export function scrollToCampaign(id: string) {
  const target = campaignElement(id);
  if (!target) return;
  window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerOffset()), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  document.getElementById(id)?.focus({ preventScroll: true });
}

export function CampaignNavigator() {
  const pathname = usePathname();
  const { language } = useSiteLanguage();
  const t = (en: string, zh: string) => language === "zh" ? zh : en;
  const [campaigns, setCampaigns] = useState<CampaignEntry[]>([]);
  const [activeId, setActiveId] = useState("");
  useEffect(() => {
    const main = document.querySelector("[data-testing-content]");
    if (!main) return;
    let entries: CampaignEntry[] = [], scanFrame = 0, scrollFrame = 0;
    const trackPosition = () => {
      const offset = headerOffset();
      const current = entries.find(item => (campaignElement(item.id)?.getBoundingClientRect().bottom ?? -1) > offset) ?? entries.at(-1);
      setActiveId(current?.id ?? "");
    };
    const scan = () => {
      entries = Array.from(main.querySelectorAll<HTMLElement>("[data-campaign-anchor]")).map(element => ({ id: element.id, name: element.dataset.campaignName ?? "", channel: element.dataset.campaignChannel ?? "" }));
      setCampaigns(previous => JSON.stringify(previous) === JSON.stringify(entries) ? previous : entries);
      trackPosition();
    };
    const scheduleScan = () => { cancelAnimationFrame(scanFrame); scanFrame = requestAnimationFrame(scan); };
    const onScroll = () => { if (scrollFrame) return; scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; trackPosition(); }); };
    const observer = new MutationObserver(scheduleScan);
    observer.observe(main, { childList: true, subtree: true });
    scheduleScan();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { observer.disconnect(); cancelAnimationFrame(scanFrame); cancelAnimationFrame(scrollFrame); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [pathname]);
  if (!campaigns.length) return null;
  const index = Math.max(0, campaigns.findIndex(item => item.id === activeId));
  const current = campaigns[index];
  const jump = (id: string) => { setActiveId(id); scrollToCampaign(id); };
  return <div className="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex justify-center"><nav aria-label={t("Campaign navigation", "Campaign 导航")} className="pointer-events-auto w-full max-w-96 rounded-2xl border border-border-button-default bg-background-primary-default p-3 shadow-card">
    <div className="mb-2 flex items-center justify-between gap-3"><p className="text-caption-1-semibold text-text-secondary">{t("Campaigns", "Campaign 导航")} <span className="ms-2 tabular-nums text-text-primary">{index + 1} / {campaigns.length}</span></p><div className="flex gap-1">
      <Button type="button" size="small" variant="ghost" iconOnly leadingIcon={RiArrowLeftSLine} aria-label={t("Previous campaign", "上一个 Campaign")} title={t("Previous campaign", "上一个 Campaign")} disabled={index === 0} onClick={() => jump(campaigns[index - 1].id)}/>
      <Button type="button" size="small" variant="ghost" iconOnly leadingIcon={RiArrowUpLine} aria-label={t("Back to campaign heading", "回到当前 Campaign 标题")} title={t("Back to campaign heading", "回到当前 Campaign 标题")} onClick={() => jump(current.id)}/>
      <Button type="button" size="small" variant="ghost" iconOnly leadingIcon={RiArrowRightSLine} aria-label={t("Next campaign", "下一个 Campaign")} title={t("Next campaign", "下一个 Campaign")} disabled={index === campaigns.length - 1} onClick={() => jump(campaigns[index + 1].id)}/>
    </div></div>
    <Select aria-label={t("Jump to campaign", "跳转到 Campaign")} selectedKey={current.id} onSelectionChange={key => { if (typeof key === "string") jump(key); }} className="min-w-0" triggerClassName="min-w-0" popoverClassName="max-w-full" renderValue={<span className="truncate" title={current.name}>{current.name}</span>}>
      {campaigns.map(item => <SelectItem key={item.id} id={item.id} textValue={`${item.channel} ${item.name}`}><div className="min-w-0"><p className="text-caption-1-regular text-text-secondary">{item.channel}</p><p className="break-words text-body-medium text-text-primary">{item.name}</p></div></SelectItem>)}
    </Select>
  </nav></div>;
}
