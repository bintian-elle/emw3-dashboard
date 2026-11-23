import type { LocalizedText } from "./script-lab-project";

export const ruleLayers = [
  { id: "strategy", title: ["Strategy", "策略层"] },
  { id: "creative", title: ["Creative", "创意层"] },
  { id: "execution", title: ["Execution", "执行层"] },
  { id: "constraints", title: ["Constraints", "约束层"] },
  { id: "single-variable", title: ["Single-variable testing", "单变量测试"] },
  { id: "multilingual", title: ["Multilingual scaling", "多语言放大"] },
] as const satisfies readonly { id: string; title: LocalizedText }[];

export type RuleLayer = typeof ruleLayers[number]["id"];
export const ruleDimensions = [
  { code: "MKT", layer: "strategy", label: ["Market", "市场"] },
  { code: "FUN", layer: "strategy", label: ["Funnel", "漏斗"] },
  { code: "AUD", layer: "strategy", label: ["Audience", "人群"] },
  { code: "PAIN", layer: "strategy", label: ["Pain point", "痛点"] },
  { code: "BEN", layer: "strategy", label: ["Selling point", "主卖点"] },
  { code: "HK", layer: "creative", label: ["Hook structure", "Hook 结构"] },
  { code: "SCN", layer: "creative", label: ["Scene", "场景"] },
  { code: "NAR", layer: "creative", label: ["Narrative", "叙事"] },
  { code: "DIR", layer: "creative", label: ["Content direction", "内容方向"] },
  { code: "EVD", layer: "creative", label: ["Evidence", "证据形式"] },
  { code: "CAST", layer: "execution", label: ["Cast", "出镜"] },
  { code: "STY", layer: "execution", label: ["Style", "风格"] },
  { code: "LEN", layer: "execution", label: ["Duration", "时长"] },
  { code: "PLT", layer: "execution", label: ["Platform", "平台"] },
  { code: "CTA", layer: "execution", label: ["CTA", "CTA"] },
  { code: "MOOD", layer: "execution", label: ["Mood", "情绪基调"] },
  { code: "AGE", layer: "execution", label: ["Age", "年龄"] },
  { code: "TONE", layer: "execution", label: ["Brand tone", "品牌语气"] },
  { code: "BAN", layer: "constraints", label: ["Prohibited terms", "合规禁用词"] },
  { code: "RULE", layer: "constraints", label: ["Pain-point matching", "匹配规则（痛点）"] },
  { code: "BEV", layer: "constraints", label: ["Selling-point evidence", "卖点合法证据"] },
  { code: "FORBID", layer: "constraints", label: ["Prohibited combinations", "禁止组合与审核规则"] },
  { code: "ROUND", layer: "single-variable", label: ["Test round", "测试轮次"] },
  { code: "VARY", layer: "single-variable", label: ["Allowed variable", "本轮替换维度"] },
  { code: "LANG", layer: "multilingual", label: ["Language", "语言"] },
  { code: "WAVE", layer: "multilingual", label: ["Rollout wave", "放大波次"] },
] as const satisfies readonly { code: string; layer: RuleLayer; label: LocalizedText }[];

export type RuleDimension = string;
export type VariablePoolAppearance = { color: string; cross: boolean };
export type RuleDimensionDefinition = { code: RuleDimension; layer: RuleLayer; label: LocalizedText; appearance?: VariablePoolAppearance };
export type NewRuleDimension = { code: RuleDimension; layer: RuleLayer; label: string; label_en: string; import_appearance?: VariablePoolAppearance | null };

export function dimensionParticipatesInCombinations(dimension: RuleDimensionDefinition) {
  return dimension.appearance?.cross
    ?? (dimension.layer === "strategy" || dimension.layer === "creative" || dimension.layer === "execution" || dimension.code === "LANG");
}

export function parseDimensionInput(value: Record<string, unknown>): NewRuleDimension | null {
  const layer = ruleLayers.find(item => item.id === value.layer);
  const code = typeof value.code === "string" ? value.code.trim().toUpperCase() : "";
  const label = typeof value.label === "string" ? value.label.trim() : "";
  const label_en = typeof value.label_en === "string" ? value.label_en.trim() : "";
  if (!layer || !/^[A-Z][A-Z0-9_-]{0,31}$/.test(code) || !label || label.length > 160 || label_en.length > 160) return null;
  return { code, layer: layer.id, label, label_en };
}

export const ruleStatuses = [
  { id: "enabled", label: ["Enabled", "启用"] },
  { id: "caution", label: ["Caution", "慎用"] },
  { id: "phase-two", label: ["Second wave", "第二轮"] },
  { id: "disabled", label: ["Disabled", "禁用"] },
  { id: "unverified", label: ["Unverified · Disabled", "未核实禁用"] },
] as const satisfies readonly { id: string; label: LocalizedText }[];

export type RuleStatus = typeof ruleStatuses[number]["id"];

const fieldLabels: Record<string, LocalizedText> = {
  exc: ["Exceptions", "例外"],
  ben: ["Allowed selling points", "合法主卖点"],
  ev: ["Allowed evidence", "合法证据"],
  hk: ["Allowed Hook structures", "合法 Hook"],
  scn: ["Allowed scenes", "合法场景"],
  dims: ["Dimensions allowed to vary", "允许替换的维度"],
  vals: ["Baseline variables", "基准变量值"],
};

export function ruleFieldDefinitions(dimension: RuleDimension) {
  const keys: Partial<Record<RuleDimension, string[]>> = {
    BAN: ["exc"], RULE: ["ben", "ev", "hk", "scn"], BEV: ["ev"], ROUND: ["dims"], BASE: ["vals"],
  };
  return (keys[dimension] ?? []).map(key => ({ key, label: fieldLabels[key] }));
}

export type RuleInput = {
  dimension: RuleDimension;
  code: string;
  label: string;
  label_en: string;
  status: RuleStatus;
  default_selected: boolean;
  fields: Record<string, string>;
  notes: string;
};

export type ScriptLabRule = RuleInput & { id: string; revision: number };

export function ruleCanBeSelected(rule: Pick<ScriptLabRule, "dimension" | "status">) {
  // Checking a prohibited term activates the guard.
  return rule.dimension === "BAN" || (rule.status !== "disabled" && rule.status !== "unverified");
}

export type RuleAction = "create" | "update" | "delete";
export type RuleActor = { scope: "internal" | "customer"; email: string };
export type RuleSnapshot = ScriptLabRule | (NewRuleDimension & { kind: "dimension" });
export type RuleHistoryEntry = {
  id: string;
  action: RuleAction;
  actor_email: string;
  changed_at: string;
  before_rule: RuleSnapshot | null;
  after_rule: RuleSnapshot | null;
};

export function parseRuleInput(value: Record<string, unknown>): RuleInput | null {
  const dimension = typeof value.dimension === "string" && /^[A-Z][A-Z0-9_-]{0,31}$/.test(value.dimension) ? value.dimension : "";
  const code = typeof value.code === "string" ? value.code.trim() : "";
  const label = typeof value.label === "string" ? value.label.trim() : "";
  const labelEn = typeof value.label_en === "string" ? value.label_en.trim() : "";
  const notes = typeof value.notes === "string" ? value.notes.trim() : "";
  const status = ruleStatuses.find(item => item.id === value.status);
  if (!dimension || !status || !code || code.length > 80 || /\p{Cc}/u.test(code)
    || !label || label.length > 160 || labelEn.length > 160 || notes.length > 1200
    || typeof value.default_selected !== "boolean") return null;
  const rawFields = value.fields;
  if (!rawFields || typeof rawFields !== "object" || Array.isArray(rawFields)) return null;
  const fields: Record<string, string> = {};
  for (const { key } of ruleFieldDefinitions(dimension)) {
    const field = (rawFields as Record<string, unknown>)[key];
    if (field === undefined) continue;
    if (typeof field !== "string" || field.length > 500) return null;
    fields[key] = field.trim();
  }
  return { dimension, code, label, label_en: labelEn, notes, status: status.id, default_selected: value.default_selected, fields };
}
