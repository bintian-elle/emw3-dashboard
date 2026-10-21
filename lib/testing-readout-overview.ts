// Reuse AI-authored evidence when the model placed reach below the collapsed summary.
export function overviewExecutiveSummary(summary: string | null | undefined, findings?: readonly string[]) {
  if (!summary || /\breach\b/i.test(summary)) return summary;
  const reach = findings?.find(text => text.startsWith("[OV-OVERALL]") && /\breach\b/i.test(text));
  return reach ? `${summary} ${reach.replace(/^\[OV-OVERALL\]\s*/, "")}` : summary;
}
