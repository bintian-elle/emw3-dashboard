import { translatedTestingReadouts } from "@/lib/testing-readout-translation";
import { NextResponse } from "next/server";
import { currentSiteUser } from "@/lib/current-site-user";
import { publishCompletedTestingReadouts } from "@/lib/testing-readout-publish";
import { readTestingReadoutCache } from "@/lib/ai-job-queue";

export async function GET(request: Request) {
  const user = await currentSiteUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawKeys = new URL(request.url).searchParams.getAll("key");
  const keys = [...new Set(rawKeys)].filter((key) =>
    /^(framework:v\d+|period:[a-z-]+:\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}(?::\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2})?)$/.test(key),
  );
  if (!keys.length || keys.length > 8 || keys.length !== rawKeys.length) {
    return NextResponse.json({ error: "Invalid readout cache key." }, { status: 400 });
  }

  // Publishing only reads completed queue results; it never calls Codex or an ads API.
  await publishCompletedTestingReadouts().catch(() => {});
  const sourceRecords = await readTestingReadoutCache(keys);
  const records = new URL(request.url).searchParams.get("language") === "zh" ? await translatedTestingReadouts(sourceRecords) : sourceRecords;
  return NextResponse.json(
    { records },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
