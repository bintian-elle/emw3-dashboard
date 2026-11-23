const sectionSlugs = {
  generator: "generator",
  candidates: "script-candidates",
  results: "results",
  rules: "rule-library",
  examples: "excellent-examples",
  trends: "trends",
} as const;

export type ScriptLabSection = keyof typeof sectionSlugs;

export function scriptLabSectionFromSlug(slug: string) {
  return (Object.keys(sectionSlugs) as ScriptLabSection[]).find(section => sectionSlugs[section] === slug);
}

export function scriptLabSectionPath(section: ScriptLabSection, customer: boolean) {
  return `${customer ? "/script-lab" : "/ai-tools/script-lab"}/${sectionSlugs[section]}`;
}

export function isPublicScriptLabSectionPath(pathname: string) {
  const slug = pathname.slice("/script-lab/".length);
  return pathname.startsWith("/script-lab/") && Boolean(scriptLabSectionFromSlug(slug) || scriptLabRetiredSection(slug));
}

export function scriptLabRetiredSection(slug: string): ScriptLabSection | undefined {
  if (slug === "candidates" || slug === "batches" || slug === "storyboard") return "candidates";
}

export function scriptLabLegacySection(view?: string): ScriptLabSection {
  return view === "rules" ? "rules" : (scriptLabRetiredSection(view ?? "") ?? "generator");
}
