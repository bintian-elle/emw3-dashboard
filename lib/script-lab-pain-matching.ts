import type { ScriptLabRule } from "./script-lab-rules";

const fields = { BEN: "ben", EVD: "ev", HK: "hk", SCN: "scn" } as const;

export function matchesPainSelection(values: ReadonlyMap<string, string>, rules: readonly ScriptLabRule[]) {
  const rule = rules.find(item => item.dimension === "RULE" && item.code === values.get("PAIN"));
  if (!rule) return true;
  return Object.entries(fields).every(([dimension, field]) => {
    const chosen = values.get(dimension);
    const allowed = (rule.fields[field] ?? "").replaceAll(" ", "").split(",").filter(Boolean);
    return !chosen || !allowed.length || allowed.includes(chosen);
  });
}
