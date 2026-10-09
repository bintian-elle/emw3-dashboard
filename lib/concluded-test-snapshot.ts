import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SnapshotDailyGroup } from "@/lib/concluded-test-period";
import type { GoogleSearchTest } from "@/lib/testing-google";

export async function readConcludedSnapshot(id: string): Promise<{capturedAt: string; finalized: boolean; sourceUpdatedAt: string | null; dailyGroups?:SnapshotDailyGroup[]; report: GoogleSearchTest} | null> {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("Invalid concluded test ID");
  try {
    const directory = process.env.CONCLUDED_TEST_SNAPSHOT_DIR || path.join(process.cwd(), ".state/concluded-tests");
    const snapshot = JSON.parse(await readFile(path.join(directory, `${id}.json`), "utf8"));
    if (snapshot.version !== 1 || snapshot.testId !== id || !Array.isArray(snapshot.report?.groups)) throw new Error("Invalid concluded test snapshot");
    return snapshot;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
