import { readFile } from "node:fs/promises";
import path from "node:path";

import type { MarketSnapshot } from "./biceek-market-model";

export const biceekRunsOnEc2 = () => process.env.BICEEK_EC2_RUNTIME === "1";

export async function readMarketSnapshot(): Promise<MarketSnapshot | null> {
  const file = process.env.BICEEK_MARKET_SNAPSHOT || (biceekRunsOnEc2()
    ? "/home/ubuntu/services/biceek-daily-report/state/market-overview.json"
    : path.join(process.cwd(), ".state", "biceek-market-overview.json"));
  try {
    const value = JSON.parse(await readFile(file, "utf8"));
    if (value.project === "biceek" && value.version === 1 && value.currency === "USD" && Array.isArray(value.rows)) return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Biceek market snapshot unavailable", error);
  }
  return null;
}
