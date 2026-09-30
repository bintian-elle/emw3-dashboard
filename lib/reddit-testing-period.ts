import type { TestingPeriodInput, TestingPeriodPreset } from "@/lib/testing-google";

export const redditSinceStartPreset = "sinceSep24";
export const redditSinceStartLabel = "Sep 24, 2026 – Now";
export type RedditPeriodInput = Omit<TestingPeriodInput, "preset"> & { preset?: TestingPeriodPreset | typeof redditSinceStartPreset };
export type RedditSearchParams = { period?: string | string[]; start?: string | string[]; end?: string | string[] };

export function redditPeriodInput(params: RedditSearchParams): RedditPeriodInput {
  const first = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;
  const period = first(params.period);
  const presets = ["lastWeek", "wtd", "mtd", "ytd", "last7", "last30", "last90", "custom", redditSinceStartPreset];
  return { preset: presets.includes(period ?? "") ? period as RedditPeriodInput["preset"] : redditSinceStartPreset, start: first(params.start), end: first(params.end) };
}
