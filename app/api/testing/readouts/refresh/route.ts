import { refreshTestingTranslations } from "@/lib/testing-readout-translation";
import { refreshTestingReadouts } from "@/lib/testing-readout-refresh";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim() || process.env.AI_WORKER_SECRET?.trim();
  if (!secret) return Response.json({ error: "An internal refresh secret is not configured." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = await request.json().catch(() => ({}));
    const analysis = input.translationsOnly === true ? null : await refreshTestingReadouts();
    const result = analysis?.pending ? analysis : { ...analysis, ...await refreshTestingTranslations() };
    return Response.json(result, { status: result.pending ? 202 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Testing readout refresh failed." }, { status: 500 });
  }
}
