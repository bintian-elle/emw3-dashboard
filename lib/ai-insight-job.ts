export type InsightPeriod = {
  range: { start: string; end: string };
  comparison: { start: string; end: string };
};

/** Language-independent identity: both tabs share one analysis and snapshot. */
export function bilingualInsightJobId(input: InsightPeriod) {
  return `summary:bilingual:${input.range.start}:${input.range.end}:${input.comparison.start}:${input.comparison.end}`;
}
