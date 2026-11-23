import { dimensionParticipatesInCombinations, parseDimensionInput, parseRuleInput, ruleFieldDefinitions, ruleStatuses,
  type NewRuleDimension, type RuleDimensionDefinition, type RuleInput, type RuleLayer, type ScriptLabRule, type VariablePoolAppearance } from "./script-lab-rules";

const blocks = {
  strategy: "S", creative: "C", execution: "E", constraints: "K", "single-variable": "T", multilingual: "L",
} satisfies Record<RuleLayer, string>;

const colors: Record<string, string> = {
  MKT: "#3B82F6",
  FUN: "#8B5CF6",
  AUD: "#EC4899",
  PAIN: "#F97316",
  BEN: "#CA8A04",
  HK: "#10B981",
  SCN: "#06B6D4",
  NAR: "#0F766E",
  EVD: "#65A30D",
  DIR: "#94A3B8",
  CAST: "#A855F7",
  STY: "#DB2777",
  LEN: "#64748B",
  PLT: "#0284C7",
  CTA: "#16A34A",
  TONE: "#C026D3",
  MOOD: "#E11D48",
  AGE: "#737373",
  BAN: "#B91C1C",
  RULE: "#B45309",
  BEV: "#4D7C0F",
  FORBID: "#7C2D12",
  ROUND: "#1D4ED8",
  BASE: "#0E7490",
  VARY: "#6D28D9",
  LANG: "#4F46E5",
  WAVE: "#9333EA",
};

export function exportVariablePool(dimensions: readonly RuleDimensionDefinition[], rules: readonly ScriptLabRule[]) {
  return {
    dims: dimensions.map(dimension => ({
      key: dimension.code,
      label: dimension.label[1],
      block: blocks[dimension.layer],
      color: dimension.appearance?.color ?? colors[dimension.code] ?? "#64748B",
      cross: dimensionParticipatesInCombinations(dimension),
      fields: ruleFieldDefinitions(dimension.code).map(field => field.key),
    })),
    vars: rules.map((rule, index) => ({
      id: `v${index + 1}`, dim: rule.dimension, code: rule.code, name: rule.label,
      status: ruleStatuses.find(item => item.id === rule.status)!.label[1],
      note: rule.notes, on: rule.default_selected, f: rule.fields,
    })),
    seq: rules.length,
  };
}

export type VariablePoolImport = { dimensions: (NewRuleDimension & { appearance: VariablePoolAppearance })[]; rules: RuleInput[] };
export type VariablePoolImportResult = { dimensions: number; added: number; skipped: number };

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseVariablePool(value: unknown): VariablePoolImport | { invalid: string } {
  if (!record(value) || !Array.isArray(value.dims) || !Array.isArray(value.vars)
    || !Number.isSafeInteger(value.seq) || Number(value.seq) < 0) return { invalid: "dims / vars / seq" };

  const dimensions: VariablePoolImport["dimensions"] = [];
  const seen = new Set<string>();
  for (const [index, item] of value.dims.entries()) {
    const row = `dims[${index + 1}]`;
    if (!record(item)) return { invalid: row };
    const layer = (Object.keys(blocks) as RuleLayer[]).find(key => blocks[key] === item.block);
    const parsed = parseDimensionInput({ code: item.key, layer, label: item.label });
    if (!parsed || parsed.code !== item.key || seen.has(parsed.code)
      || typeof item.color !== "string" || !/^#[0-9a-f]{6}$/i.test(item.color) || typeof item.cross !== "boolean"
      || !Array.isArray(item.fields) || item.fields.some(field => !ruleFieldDefinitions(parsed.code).some(definition => definition.key === field))) {
      return { invalid: row };
    }
    seen.add(parsed.code);
    dimensions.push({ ...parsed, appearance: { color: item.color, cross: item.cross } });
  }

  const rules: RuleInput[] = [];
  for (const [index, item] of value.vars.entries()) {
    const row = `vars[${index + 1}]`;
    if (!record(item) || typeof item.dim !== "string" || !record(item.f) || typeof item.note !== "string") {
      return { invalid: row };
    }
    const status = ruleStatuses.find(rule => rule.label[1] === item.status || rule.id === item.status);
    const allowedFields = ruleFieldDefinitions(item.dim);
    if (Object.keys(item.f).some(key => !allowedFields.some(field => field.key === key))) return { invalid: row };
    const parsed = parseRuleInput({
      dimension: item.dim, code: item.code, label: item.name, notes: item.note,
      status: status?.id, default_selected: item.on, fields: item.f,
    });
    if (!parsed) return { invalid: row };
    rules.push(parsed);
  }
  return { dimensions, rules };
}
