"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { RiArrowLeftSLine, RiArrowRightSLine, RiArrowUpLine } from "@remixicon/react";
import { ArrowLeft, ArrowRight, ArrowUp, Check, ChevronDown } from "lucide-react";
import { Select as RadixSelect } from "radix-ui";
import { Button } from "@/components/base/buttons/button";
import { Select, SelectItem } from "@/components/base/select/select";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import { NovaButton } from "./nova-preview-ui";
import styles from "./campaign-navigator.module.css";

type CampaignEntry = { id: string; name: string; channel: string };
function campaignElement(id: string) {
  return document.getElementById(id);
}
function headerOffset() {
  return (document.querySelector("[data-testing-header]")?.getBoundingClientRect().height ?? 0) + 16;
}
function scrollContainer(element: Element | null): HTMLElement | null {
  const candidate = element?.closest<HTMLElement>("[data-testing-scroll]");
  return candidate && /^(auto|scroll|overlay)$/.test(getComputedStyle(candidate).overflowY) ? candidate : null;
}
export function scrollToCampaign(id: string) {
  const target = campaignElement(id);
  if (!target) return;
  const container = scrollContainer(target);
  const top = container
    ? target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - headerOffset()
    : target.getBoundingClientRect().top + window.scrollY - headerOffset();
  const options = { top: Math.max(0, top), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" as const : "smooth" as const };
  if (container) container.scrollTo(options); else window.scrollTo(options);
  document.getElementById(id)?.focus({ preventScroll: true });
}

export function CampaignNavigator({variant = "default"}: {variant?: "default" | "nova"} = {}) {
  const pathname = usePathname();
  const requestedCampaign = useSearchParams().get("campaign");
  const { language } = useSiteLanguage();
  const t = (en: string, zh: string) => language === "zh" ? zh : en;
  const [campaigns, setCampaigns] = useState<CampaignEntry[]>([]);
  const [activeId, setActiveId] = useState("");
  useEffect(() => {
    const main = document.querySelector("[data-testing-content]");
    if (!main) return;
    let entries: CampaignEntry[] = [], scanFrame = 0, scrollFrame = 0;
    let locatedRequestedCampaign = false;
    const trackPosition = () => {
      const offset = headerOffset() + (scrollContainer(main)?.getBoundingClientRect().top ?? 0);
      const container = scrollContainer(main);
      const atBottom = container
        ? container.scrollTop + container.clientHeight >= container.scrollHeight - 2
        : window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      const last = entries.at(-1);
      const lastVisible = last && (campaignElement(last.id)?.getBoundingClientRect().top ?? Infinity) < window.innerHeight;
      const current = atBottom && lastVisible ? last : [...entries].reverse().find(item => (campaignElement(item.id)?.getBoundingClientRect().top ?? Infinity) <= offset + 2) ?? entries[0];
      setActiveId(current?.id ?? "");
    };
    const scan = () => {
      entries = Array.from(main.querySelectorAll<HTMLElement>("[data-campaign-anchor]")).filter(element => element.id).map(element => ({ id: element.id, name: element.dataset.campaignName ?? "", channel: element.dataset.campaignChannel ?? "" }));
      setCampaigns(previous => JSON.stringify(previous) === JSON.stringify(entries) ? previous : entries);
      trackPosition();
      const requested = entries.find(item => item.name === requestedCampaign);
      if (requested && !locatedRequestedCampaign) { locatedRequestedCampaign = true; scrollToCampaign(requested.id); }
    };
    const scheduleScan = () => { cancelAnimationFrame(scanFrame); scanFrame = requestAnimationFrame(scan); };
    const onScroll = () => { if (scrollFrame) return; scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; trackPosition(); }); };
    const observer = new MutationObserver(scheduleScan);
    observer.observe(main, { childList: true, subtree: true });
    scheduleScan();
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    return () => { observer.disconnect(); cancelAnimationFrame(scanFrame); cancelAnimationFrame(scrollFrame); window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", onScroll); };
  }, [pathname, requestedCampaign]);
  if (!campaigns.length) return null;
  const index = Math.max(0, campaigns.findIndex(item => item.id === activeId));
  const current = campaigns[index];
  const jump = (id: string) => { setActiveId(id); scrollToCampaign(id); };
  if (variant === "nova") return <div style={{right:"calc(var(--testing-chat-offset, 0px) + 1rem)"}} className={styles.container}><nav aria-label={t("Campaign navigation", "Campaign 导航")} className={styles.navigation}>
    <div className={styles.header}><p>{t("Campaigns", "Campaign 导航")} <span>{index + 1} / {campaigns.length}</span></p><div className={styles.actions}>
      <NovaButton type="button" size="icon" variant="ghost" aria-label={t("Previous campaign", "上一个 Campaign")} title={t("Previous campaign", "上一个 Campaign")} disabled={index === 0} onClick={() => jump(campaigns[index - 1].id)}><ArrowLeft aria-hidden="true"/></NovaButton>
      <NovaButton type="button" size="icon" variant="ghost" aria-label={t("Back to campaign heading", "回到当前 Campaign 标题")} title={t("Back to campaign heading", "回到当前 Campaign 标题")} onClick={() => jump(current.id)}><ArrowUp aria-hidden="true"/></NovaButton>
      <NovaButton type="button" size="icon" variant="ghost" aria-label={t("Next campaign", "下一个 Campaign")} title={t("Next campaign", "下一个 Campaign")} disabled={index === campaigns.length - 1} onClick={() => jump(campaigns[index + 1].id)}><ArrowRight aria-hidden="true"/></NovaButton>
    </div></div>
    <RadixSelect.Root value={current.id} onValueChange={jump}><RadixSelect.Trigger className={styles.trigger} aria-label={t("Jump to campaign", "跳转到 Campaign")}><RadixSelect.Value/><RadixSelect.Icon><ChevronDown aria-hidden="true"/></RadixSelect.Icon></RadixSelect.Trigger><RadixSelect.Portal><RadixSelect.Content className={styles.options} position="popper" sideOffset={5}><RadixSelect.Viewport>{campaigns.map(item=><RadixSelect.Item key={item.id} value={item.id} className={styles.option}><RadixSelect.ItemText>{item.channel} · {item.name}</RadixSelect.ItemText><RadixSelect.ItemIndicator><Check aria-hidden="true"/></RadixSelect.ItemIndicator></RadixSelect.Item>)}</RadixSelect.Viewport></RadixSelect.Content></RadixSelect.Portal></RadixSelect.Root>
  </nav></div>;
  return <div style={{right:"calc(var(--testing-chat-offset, 0px) + 1rem)"}} className="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex justify-center"><nav aria-label={t("Campaign navigation", "Campaign 导航")} className="pointer-events-auto w-full max-w-96 rounded-2xl border border-border-button-default bg-background-primary-default p-3 shadow-card">
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
