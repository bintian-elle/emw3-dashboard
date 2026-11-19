export const marketNames = {
  GB: ["United Kingdom", "英国"], DE: ["Germany", "德国"], FR: ["France", "法国"],
  NL: ["Netherlands", "荷兰"], BE: ["Belgium", "比利时"], IT: ["Italy", "意大利"], ES: ["Spain", "西班牙"],
} as const;
export type Market = keyof typeof marketNames;
export const firstMarketDay = "2026-10-26";
export const localizationLaunch = "2026-11-13";
export type MarketMetric = "googleSpend" | "googleRevenue" | "metaSpend" | "metaRevenue" | "shopifySales" | "orders";
export type MarketDay = Record<MarketMetric, number | null> & { date: string; market: Market };
export type MarketSnapshot = { through: string; refreshedAt: string; rows: MarketDay[] };
