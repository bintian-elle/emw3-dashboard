import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { readEdmInsightPrompt } from "./ai-insight-prompt.ts";

test("EDM prompt edits are read without a process restart", async () => {
  const previous = process.cwd();
  const root = await mkdtemp(join(tmpdir(), "edm-prompt-"));
  try {
    await mkdir(join(root, "prompts", "insights"), { recursive: true });
    process.chdir(root);
    const path = join(root, "prompts", "insights", "edm.md");
    await writeFile(path, "# EDM\nFirst analytical guidance.\n");
    assert.equal(await readEdmInsightPrompt(), "# EDM\nFirst analytical guidance.");
    await writeFile(path, "# EDM\nRevised analytical guidance.\n");
    assert.equal(await readEdmInsightPrompt(), "# EDM\nRevised analytical guidance.");
    await writeFile(path, "\n");
    await assert.rejects(readEdmInsightPrompt(), /prompt is empty/);
  } finally {
    process.chdir(previous);
    await rm(root, { recursive: true, force: true });
  }
});
