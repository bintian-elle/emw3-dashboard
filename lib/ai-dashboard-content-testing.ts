export type ContentTestingSnapshot = {
  project: "bluevua";
  sourcePage: "/bluevua/testing";
  range: { start: string; end: string };
  tests: Array<{ channel: string; campaign: string; data: unknown }>;
  concluded: unknown[];
  dataGaps: string[];
  metricContract: unknown;
  navigationLinks: unknown[];
};
const channels = new Set(["overview", "google-search", "google-pmax", "google-demand-gen", "meta", "reddit", "edm", "concluded"]);
const explicit = /content\s*testing|(?:内容|素材|创意)\s*测试/i;
function userText(conversation: unknown): string {
  if (!Array.isArray(conversation)) return "";
  const latest = [...conversation].reverse().find(row => row && typeof row === "object" && row.role === "user");
  if (!latest) return "";
  return typeof latest.content === "string" ? latest.content : typeof latest.text === "string" ? latest.text : "";
}
export function wantsContentTesting(project: string, prompt: unknown, conversation?: unknown): boolean {
  if (project.toLowerCase() !== "bluevua") return false;
  return explicit.test(typeof prompt === "string" ? prompt : "") || explicit.test(userText(conversation));
}
export function contentTestingQuery(snapshot: ContentTestingSnapshot, raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Expected a Content Testing filter object.");
  const query = raw as Record<string, unknown>;
  if (Object.keys(query).some(key => key !== "channel" && key !== "campaign")) throw new Error("Unsupported Content Testing filter.");
  if (query.channel !== undefined && (typeof query.channel !== "string" || !channels.has(query.channel))) throw new Error("Unknown Content Testing channel.");
  if (query.campaign !== undefined && (typeof query.campaign !== "string" || !snapshot.tests.some(test => test.campaign === query.campaign))) throw new Error("Unknown Content Testing campaign.");
  const tests = snapshot.tests.filter(test => (!query.channel || query.channel === "overview" || test.channel === query.channel) && (!query.campaign || test.campaign === query.campaign));
  return { ...snapshot, tests, concluded: !query.campaign && (!query.channel || query.channel === "overview" || query.channel === "concluded") ? snapshot.concluded : [], dataGaps: tests.length || query.channel === "concluded" ? [...snapshot.dataGaps] : [...snapshot.dataGaps, "No Content Testing data is available for this filter."] };
}
