import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Read on each new request so editing the Markdown requires no rebuild. */
export async function readEdmInsightPrompt() {
  const prompt = (await readFile(join(process.cwd(), "prompts", "insights", "edm.md"), "utf8")).trim();
  if (!prompt) throw new Error("The EDM Insights prompt is empty.");
  return prompt;
}
