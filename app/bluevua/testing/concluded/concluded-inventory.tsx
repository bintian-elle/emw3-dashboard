"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import { concludedChannels, concludedTestsForChannel } from "@/lib/concluded-tests";
import { testingCampaignAnchor } from "@/lib/testing-navigation";
import { NovaButton, NovaCard, NovaInput } from "../nova-preview-ui";
import { TestingChannelBrand } from "../testing-channel-brand";
import TestingLink from "../testing-link";
import styles from "../inventory/inventory.module.css";

const campaigns = concludedChannels.flatMap(channel => {
  const unique = new Map<string, number>();
  for (const test of concludedTestsForChannel(channel)) unique.set(test.campaignName, (unique.get(test.campaignName) ?? 0) + 1);
  return Array.from(unique, ([name, count]) => ({ channel, name, count }));
});

export function ConcludedInventory() {
  const { language } = useSiteLanguage();
  const zh = language === "zh";
  const [search, setSearch] = useState("");
  const items = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return campaigns.filter(item => `${item.channel} ${item.name}`.toLocaleLowerCase().includes(query));
  }, [search]);
  return <NovaCard className={styles.card}>
    <div className={styles.toolbar}><div><h2>{zh ? "已结束测试清单" : "Concluded test inventory"}</h2><p>{zh ? "按 Campaign 单独计数，不包含广告和素材组。" : "Campaigns are counted separately from ads and asset groups."}</p></div>
      <div className={styles.search}><Search aria-hidden="true"/><NovaInput type="search" aria-label={zh ? "搜索已结束测试" : "Search concluded tests"} placeholder={zh ? "搜索 Campaign…" : "Search campaigns..."} value={search} onChange={event => setSearch(event.target.value)}/></div>
    </div>
    <div className={styles.list}>{items.map(({ channel, name, count }) => {
      const slug = channel.toLowerCase().replaceAll(" ", "-");
      return <NovaButton key={`${channel}:${name}`} variant="ghost" asChild className={styles.item}><TestingLink href={`/bluevua/testing/concluded/${slug}#${encodeURIComponent(testingCampaignAnchor(slug, name))}`} prefetch={false}><span className={styles.symbol}><TestingChannelBrand name={channel}/></span><span className={styles.identity}><strong>{name}</strong><span>{channel}{count > 1 ? ` · ${count} tests` : ""}</span></span><ArrowUpRight aria-hidden="true"/></TestingLink></NovaButton>;
    })}</div>
    {!items.length && <div className={styles.empty}><strong>{search ? (zh ? "没有匹配的 Campaign" : "No matching campaigns") : (zh ? "暂无已结束的 Campaign" : "No concluded campaigns")}</strong>{search && <><p>{zh ? "请清除搜索后重试。" : "Clear the search and try again."}</p><NovaButton variant="outline" onClick={() => setSearch("")}>{zh ? "清除搜索" : "Reset filters"}</NovaButton></>}</div>}
  </NovaCard>;
}
