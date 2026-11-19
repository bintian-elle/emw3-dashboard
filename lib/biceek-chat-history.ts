import { createHash, randomUUID } from "node:crypto";
import { link, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ComparisonRange } from "./testing-comparison";

export type BiceekChatScope = ComparisonRange & { market?: "GB"; comparison?: ComparisonRange };
export type BiceekChatTurn = { id: string; conversation: string; scope: BiceekChatScope; question: string; answer: string | null; at: string };

export const validChatId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);

function accountDirectory(owner: string) {
  return path.join(process.env.BICEEK_CHAT_HISTORY_DIR || path.join(process.cwd(), ".state", "biceek-chat"),
    createHash("sha256").update(owner).digest("hex"));
}

export async function listBiceekChat(owner: string): Promise<BiceekChatTurn[]> {
  const directory = accountDirectory(owner);
  let files: string[];
  try { files = await readdir(directory); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const turns = await Promise.all(files.filter(file => file.endsWith(".json") && validChatId(file.slice(0, -5)))
    .map(async file => JSON.parse(await readFile(path.join(directory, file), "utf8")) as BiceekChatTurn));
  return turns.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
}

export async function saveBiceekChat(owner: string, turn: BiceekChatTurn, creating = false) {
  const directory = accountDirectory(owner);
  if (!validChatId(turn.id)) throw new Error("Invalid chat turn id");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, turn.id + ".json"), temporary = path.join(directory, "." + randomUUID());
  try {
    await writeFile(temporary, JSON.stringify(turn), { mode: 0o600, flag: "wx" });
    if (creating) await link(temporary, file);
    else await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
}

export function sameBiceekChatScope(a: BiceekChatScope, b: BiceekChatScope) {
  return a.start === b.start && a.end === b.end && a.market === b.market &&
    a.comparison?.start === b.comparison?.start && a.comparison?.end === b.comparison?.end;
}
