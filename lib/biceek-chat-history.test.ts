import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { listBiceekChat, saveBiceekChat, sameBiceekChatScope, type BiceekChatTurn } from "./biceek-chat-history.ts";

test("identity owns both pending questions and completed answers", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "biceek-chat-test-"));
  const previous = process.env.BICEEK_CHAT_HISTORY_DIR;
  process.env.BICEEK_CHAT_HISTORY_DIR = directory;
  try {
    const turn: BiceekChatTurn = {
      id: "10000000-0000-4000-8000-000000000001", conversation: "20000000-0000-4000-8000-000000000001",
      scope: { start: "2026-11-17", end: "2026-11-17", market: "GB", comparison: { start: "2026-11-16", end: "2026-11-16" } },
      question: "Synthetic question", answer: null, at: "2026-11-19T12:00:00Z",
    };
    await saveBiceekChat("account-a", turn, true);
    assert.deepEqual(await listBiceekChat("account-a"), [turn]);
    assert.deepEqual(await listBiceekChat("account-b"), []);
    await assert.rejects(saveBiceekChat("account-a", { ...turn, question: "duplicate" }, true), { code: "EEXIST" });
    await saveBiceekChat("account-a", { ...turn, answer: "Synthetic answer" });
    await saveBiceekChat("account-b", { ...turn, question: "Other account", answer: "Other answer" }, true);
    assert.equal((await listBiceekChat("account-a"))[0].answer, "Synthetic answer");
    assert.equal((await listBiceekChat("account-b"))[0].answer, "Other answer");
    assert.equal(sameBiceekChatScope(turn.scope, { ...turn.scope, market: undefined }), false);
  } finally {
    if (previous === undefined) delete process.env.BICEEK_CHAT_HISTORY_DIR;
    else process.env.BICEEK_CHAT_HISTORY_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
