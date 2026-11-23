import "server-only";

import { queryScriptLab } from "./script-lab-store";
import { type TrendFeed, type TrendItem } from "./script-lab-trends";

const hour = 3_600_000;
const instagramMinimum = 6;

function searchVolume(item: TrendItem): number {
  const value = item.metrics.find(metric => metric.label === "volume")?.value;
  const match = String(value ?? "").trim().replaceAll(",", "").match(/^(\d+(?:\.\d+)?)\s*([KM])?\+?$/i);
  if (!match) return -1;
  const unit = match[2]?.toUpperCase();
  return Number(match[1]) * (unit === "M" ? 1_000_000 : unit === "K" ? 1_000 : 1);
}

export async function loadTrendFeed(): Promise<TrendFeed> {
  const rows = await queryScriptLab<{ item: TrendItem; checked_at: string }>(
    "SELECT item, checked_at FROM script_lab.trend_references WHERE expires_at > now() ORDER BY checked_at DESC, id LIMIT 500",
    [], 18000,
  );
  const now = Date.now();
  const recent = (item: TrendItem, hours: number) => {
    const published = Date.parse(item.publishedAt ?? "");
    return published <= now && published >= now - hours * hour;
  };
  const items = rows.map(({ item, checked_at }) => item.kind === "ad"
    ? { ...item, observedAt: new Date(checked_at).toISOString().slice(0, 10) }
    : item);
  const instagram = items.filter(item => item.source === "instagram" && recent(item, 720));
  const weekly = instagram.filter(item => recent(item, 168));
  const useMonthly = weekly.length < instagramMinimum && instagram.length > 0;
  const instagramHours = instagram.length ? (useMonthly ? 720 : 168) : null;
  return {
    items: [
      ...items.filter(item => item.source === "tiktok" && (item.kind === "ad" ? item.coverageHours === 168 : recent(item, 168)))
        .sort((first, second) => (first.rank ?? 0) - (second.rank ?? 0)),
      ...(useMonthly ? instagram : weekly).map(item => ({ ...item, coverageHours: useMonthly ? 720 : 168 })),
      ...items.filter(item => item.source === "google" && recent(item, 24))
        .sort((first, second) => Number(Boolean(second.searchAnalysis)) - Number(Boolean(first.searchAnalysis))
          || searchVolume(second) - searchVolume(first)
          || Date.parse(second.publishedAt!) - Date.parse(first.publishedAt!)),
    ],
    instagramHours,
    updatedAt: rows[0]?.checked_at ?? null,
  };
}

export async function loadTrendReference(id: string) {
  const feed = await loadTrendFeed();
  const item = feed.items.find(entry => entry.id === id);
  if (!item?.hook || !item.takeaway) return undefined;
  return { title: item.title, source: item.source, url: item.url, hook: item.hook, takeaway: item.takeaway };
}
