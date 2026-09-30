export const redditContentTests = [
  { name: "EM-Reddit-Conversion-July26", kind: "Conversion", groups: ["Prospecting_WaterFilter + HydroHomies"], ads: {
    Video: ["Prospecting-Video-PitcherVersusRO", "Conv-WF-Video-RO-OrangeJuice"],
    Image: ["SingleImage-MicroplasticPitcherVsRO", "SingleImage-ReplaceFilterPitcherVsRO", "SingleImage-TastePitchervsRO", "SingleImage-PitcherSafeEnough-ROPOTUV-4:5"],
    Message: [],
  } },
  { name: "EM-Reddit-Awareness-July26", kind: "Awareness", groups: ["HydroHomies"], ads: {
    Video: ["Video-RO-OrangeJuice", "Video-PitcherVersusRO"], Image: [],
    Message: ["Freefrom-FamiliarRoutineFilterReplace", "Freeform-NoRefill-No.1CounterRO"],
  } },
] as const;

export function redditTestFormat(campaignName: string, adName: string) {
  const test = redditContentTests.find(test => test.name === campaignName);
  return (["Video", "Image", "Message"] as const).find(format =>
    test?.ads[format].some(name => name === adName.trim()),
  );
}

export function redditContentPeriod(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(part => part.type === type)!.value;
  return { start: "2026-09-24", end: `${part("year")}-${part("month")}-${part("day")}` };
}

export function redditContentMetrics(kind: "Awareness" | "Conversion", format: "Image" | "Video" | "Message") {
  return [
    ...(kind === "Awareness" ? [{ key: "impressions", label: "Impressions" }] : []),
    { key: "cpc", label: "CPC" }, { key: "ctr", label: "CTR" },
    { key: "revenue", label: "Purchase: Web Total Value" },
    ...(kind === "Awareness" || format === "Image" ? [{ key: "roas", label: "Purchase ROAS (Return On Ad Spend)" }] : []),
  ] as Array<{ key: "impressions" | "cpc" | "ctr" | "revenue" | "roas"; label: string }>;
}

export function redditTestGroup(campaignName: string, groupName: string) {
  return redditContentTests.find(test => test.name === campaignName)?.groups.some(name => name === groupName.trim()) ?? false;
}
