export type SiteLanguage = "en" | "zh";
export function isSiteLanguage(value: unknown): value is SiteLanguage { return value === "en" || value === "zh"; }
