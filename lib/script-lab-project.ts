export type LocalizedText = readonly [string, string];

export interface ScriptLabCandidate {
  id: "commute" | "home" | "shop" | "travel";
  name: LocalizedText;
  format: string;
  visual: LocalizedText;
}

export interface ScriptLabProject {
  slug: string;
  brand: string;
  product: string;
  workspace: {
    candidates: ScriptLabCandidate[];
    variables: { name: LocalizedText; values: LocalizedText[] }[];
    sellingPoints: { code: string; name: string; original: string; pain?: LocalizedText }[];
    initialBatch: ScriptLabCandidate["id"][];
  };
}
