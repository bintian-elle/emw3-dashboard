import type { LocalizedText } from "./script-lab-project";

export const roundOneAudiences = [
  { code: "COMM", label: ["Daily commuters", "日常通勤者"] },
  { code: "ROAD", label: ["Road cyclists", "公路车骑行者"] },
  { code: "EBIKE", label: ["E-bike riders", "电助力车用户"] },
  { code: "NEW", label: ["New cyclists", "骑行新手"] },
  { code: "GIFT", label: ["Partners and gift buyers", "伴侣 / 送礼者"] },
  { code: "TRIP", label: ["Travel cyclists", "旅行骑行者"] },
] as const satisfies readonly { code: string; label: LocalizedText }[];

export const excludedRoundOneAudiences = [
  { code: "URBAN", label: ["Young urban professionals", "城市年轻上班族"] },
  { code: "TECHAUD", label: ["Bike shop mechanics", "自行车店技师"] },
  { code: "REVAUD", label: ["Tech reviewers", "科技产品测评者"] },
] as const;

export type RoundOneAudienceCode = typeof roundOneAudiences[number]["code"];

// The customer recording supplies the baseline execution settings. The sheet supplies the matching rule and Hook example.
export const roundOneControls = {
  market: { code: "DE", label: ["Germany", "德国"] },
  funnel: { code: "AW", label: ["Awareness", "认知"] },
  pain: { code: "VIS", label: ["Externally mounted trackers are easy to spot", "外挂容易被发现"] },
  sellingPoint: { code: "HIDE", label: ["Concealed installation", "隐蔽安装"] },
  evidenceCode: "SIZE",
  evidence: ["Product size close-up and real installation demonstration", "产品尺寸近景；实际安装演示"],
  hook: {
    code: "H05",
    label: ["Hidden discovery", "隐藏发现"],
    allowed: ["H05", "H02"],
    exampleId: "HK-010",
    example: "Wait—there’s a bike finder inside this handlebar.",
  },
  scene: { code: "OFF", label: ["Parking outside the office", "办公室楼下停车"] },
  narrative: { code: "DEMO", label: ["Product demonstration", "产品演示"] },
  cast: { code: "USER", label: ["Real user", "用户本色"] },
  style: { code: "UGC", label: ["UGC", "真实记录"] },
  duration: { code: "L30", label: ["20–30 seconds", "20–30 秒"] },
  platform: { code: "META", label: ["Meta", "Meta"] },
  ctaCode: "LM",
  cta: "Learn more",
  language: { code: "DE", label: ["German", "德语"] },
  compliance: ["Show visible proof of the concealed installation. Avoid references to crime or threats.", "必须展示隐藏安装的可见证明；不使用犯罪或威胁表达。"],
} as const;

export function isRoundOneAudience(code: unknown): code is RoundOneAudienceCode {
  return roundOneAudiences.some((audience) => audience.code === code);
}

export function createRoundOneBrief(code: RoundOneAudienceCode) {
  const audience = roundOneAudiences.find((item) => item.code === code);
  if (!audience) throw new Error("Unknown Biceek audience");
  const { market, funnel, pain, sellingPoint, hook, duration } = roundOneControls;
  const id = ["FH200", market.code, funnel.code, code, pain.code, sellingPoint.code, hook.code, duration.code, "v1"].join("_");
  return { ...roundOneControls, id, audience, name: audience.label };
}

export type RoundOneBrief = ReturnType<typeof createRoundOneBrief>;

export function roundOneBriefFields(brief: RoundOneBrief): { label: LocalizedText; value: LocalizedText }[] {
  const fields = [
    { label: ["Market", "市场"], field: brief.market },
    { label: ["Funnel", "漏斗"], field: brief.funnel },
    { label: ["Audience", "人群"], field: brief.audience },
    { label: ["Pain point", "痛点"], field: brief.pain },
    { label: ["Selling point", "主卖点"], field: brief.sellingPoint },
    { label: ["Hook structure", "Hook 结构"], field: brief.hook },
    { label: ["Scene", "场景"], field: brief.scene },
    { label: ["Narrative", "叙事"], field: brief.narrative },
    { label: ["Cast", "出镜"], field: brief.cast },
    { label: ["Style", "风格"], field: brief.style },
    { label: ["Duration", "时长"], field: brief.duration },
    { label: ["Platform", "平台"], field: brief.platform },
    { label: ["Language", "语言"], field: brief.language },
  ] as const;
  return [
    ...fields.map(({ label, field }) => ({ label, value: [`${field.code} · ${field.label[0]}`, `${field.code} · ${field.label[1]}`] as const })),
    { label: ["Required evidence", "必须证明"], value: [`${brief.evidenceCode} · ${brief.evidence[0]}`, `${brief.evidenceCode} · ${brief.evidence[1]}`] as const },
    { label: ["Hook example (English reference)", "Hook 示例（英文参考）"], value: [`${brief.hook.exampleId} · ${brief.hook.example}`, `${brief.hook.exampleId} · ${brief.hook.example}`] },
    { label: ["CTA (English reference)", "CTA（英文参考）"], value: [`${brief.ctaCode} · ${brief.cta}`, `${brief.ctaCode} · ${brief.cta}`] as const },
    { label: ["Compliance requirements", "合规要求"], value: brief.compliance },
  ];
}


export function roundOneSequence(index: number) {
  return String(index + 1).padStart(8, "0");
}

export function buildRoundOneKeywords(briefs: RoundOneBrief[], order: RoundOneBrief[], zh: boolean) {
  const language = zh ? 1 : 0;
  const heading = zh ? "序号 | 文件名 | 关键词串" : "No. | Filename | Keywords";
  const title = zh ? "Findhoo 200 Video 关键词" : "Findhoo 200 Video Keywords";
  const scope = zh ? "第一轮，仅改变人群" : "Round 1, audience only";
  const result = zh ? `无冲突 ${briefs.length} 条` : `${briefs.length} combinations passed round-one checks`;
  const legend = zh ? "带星号的字段由基准或匹配规则自动带出。" : "An asterisk marks fields filled from the baseline or matching rules.";
  const rows = briefs.map((brief) => {
    const keywords = roundOneBriefFields(brief).map(({ label, value }, index) => `${label[language]}: ${value[language]}${index >= 4 ? "\\*" : ""}`).join(" · ");
    const escaped = keywords.replaceAll("|", "\\|");
    return `| ${roundOneSequence(order.findIndex(({ id }) => id === brief.id))} | ${brief.id} | ${escaped} |`;
  });
  return [`# ${title} (${briefs.length})`, "", `- ${scope}`, `- ${result}`, `- ${legend}`, "", `| ${heading} |`, "| --- | --- | --- |", ...rows, ""].join("\n");
}
