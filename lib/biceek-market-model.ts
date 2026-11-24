export const marketNames = {
  GB: ["United Kingdom", "英国"], DE: ["Germany", "德国"], FR: ["France", "法国"],
  NL: ["Netherlands", "荷兰"], BE: ["Belgium", "比利时"], IT: ["Italy", "意大利"], ES: ["Spain", "西班牙"],
} as const;
export type Market = keyof typeof marketNames;
export const firstMarketDay = "2026-10-26";
export const localizationLaunch = "2026-11-13";
export type FunnelMetric = "sessions" | "addToCart" | "beginCheckout";
export type MarketMetric = FunnelMetric | "googleSpend" | "googleRevenue" | "metaSpend" | "metaRevenue" | "shopifySales" | "orders";
export type MarketDay = Record<Exclude<MarketMetric, FunnelMetric>, number | null> & Partial<Record<FunnelMetric, number | null>> & { date: string; market: Market };
export type MarketSnapshot = { demo?: boolean; through: string; refreshedAt: string; rows: MarketDay[] };
