// Translate human-readable leaves only. Identifiers, dates, metrics and schema stay intact.
const proseFields = new Set(["executive_summary", "key_findings", "recommended_actions", "data_gaps", "summary", "recommended_action", "asset_insights", "evidence", "test_goal", "text", "comparison_label", "interpretation"]);
export function readoutTranslationStrings(payload: unknown): string[] {
  const values = new Set<string>();
  function visit(value: unknown, field = "") {
    if (typeof value === "string") { if (proseFields.has(field) && value.trim() && !value.startsWith("[FRAMEWORK] ")) values.add(value); }
    else if (Array.isArray(value)) value.forEach(item => visit(item, field));
    else if (value && typeof value === "object") Object.entries(value).forEach(([key, item]) => visit(item, key));
  }
  visit(payload); return [...values];
}
export function applyReadoutTranslation(payload: unknown, translations: Map<string, string>): unknown {
  function visit(value: unknown, field = ""): unknown {
    if (typeof value === "string") return proseFields.has(field) ? translations.get(value) ?? value : value;
    if (Array.isArray(value)) return value.map(item => visit(item, field));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item, key)]));
    return value;
  }
  return visit(payload);
}
export function translationChunks(strings: string[], maximum = 12000) {
  const chunks: string[][] = []; let chunk: string[] = [], size = 0;
  for (const text of strings) {
    if (text.length > maximum) throw new Error("Translation source exceeds the supported chunk size.");
    if (size + text.length > maximum) { chunks.push(chunk); chunk = []; size = 0; }
    chunk.push(text); size += text.length;
  }
  if (chunk.length) chunks.push(chunk);
  return chunks;
}
export function decodeReadoutTranslation(result: unknown, source: string[]): Map<string, string> {
  const answer = (result as { answer_markdown?: string })?.answer_markdown ?? "";
  const match = answer.match(/<translation-json>\s*([\s\S]*?)\s*<\/translation-json>/);
  if (!match) throw new Error("Missing translation JSON block.");
  const decoded = JSON.parse(match[1]) as unknown;
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) throw new Error("Invalid translation dictionary.");
  const values = decoded as Record<string, unknown>;
  if (Object.keys(values).length !== source.length) throw new Error("Incomplete translation coverage.");
  return new Map(source.map((text, index) => {
    const translated = values[`s${index}`];
    if (typeof translated !== "string" || !translated.trim()) throw new Error("Missing translated text.");
    // URLs and every numeric token must survive unchanged; compare as multisets,
    // allowing Chinese sentence order to differ from English.
    const months: Record<string, string> = { January:"1",February:"2",March:"3",April:"4",May:"5",June:"6",July:"7",August:"8",September:"9",October:"10",November:"11",December:"12" };
    const chineseMonths: Record<string,string> = {一月:"1",二月:"2",三月:"3",四月:"4",五月:"5",六月:"6",七月:"7",八月:"8",九月:"9",十月:"10",十一月:"11",十二月:"12"};
    const tokens = (value: string) => (value.replace(/(?<![前后每一二三四五六七八九十])[一二三四五六七八九十]+月/g, month => chineseMonths[month] ?? month).replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g, month => months[month]).match(/https?:\/\/[^\s)\]>]+|\d+(?:,\d{3})*(?:\.\d+)?/g) ?? []).map(token => token.startsWith("http") ? token.replace(/[.,;:，。；：]+$/, "") : token).sort();
    const remaining = tokens(translated);
    for (const token of tokens(text)) {
      const index = remaining.indexOf(token);
      if (index < 0) throw new Error("Translation changed source numbers or links.");
      remaining.splice(index, 1);
    }
    // English "one click" -> Chinese "1 次点击" changes notation, not value.
    // Existing numerals/URLs are still mandatory; extra digits require a matching
    // source number word, with the same maximum occurrence count.
    const words: Record<string, string> = { zero:"0",one:"1",two:"2",three:"3",four:"4",five:"5",six:"6",seven:"7",eight:"8",nine:"9",ten:"10",eleven:"11",twelve:"12",thirteen:"13",fourteen:"14",fifteen:"15",sixteen:"16",seventeen:"17",eighteen:"18",nineteen:"19",twenty:"20",first:"1",second:"2",third:"3",fourth:"4",fifth:"5",sixth:"6",seventh:"7",eighth:"8",ninth:"9",tenth:"10",single:"1",both:"2" };
    const prose = text.replace(/https?:\/\/[^\s)\]>]+/g, "");
    const allowed = (prose.match(new RegExp(`\\b(${Object.keys(words).join("|")})\\b`, "gi")) ?? []).map(word => words[word.toLowerCase()]);
    for (const token of remaining) {
      const index = allowed.indexOf(token);
      if (index < 0) throw new Error("Translation changed source numbers or links.");
      allowed.splice(index, 1);
    }
    return [text, translated];
  }));
}
