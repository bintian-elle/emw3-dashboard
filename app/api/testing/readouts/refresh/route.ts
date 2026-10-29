import { refreshConcludedTestingReadouts } from "@/lib/testing-readout-concluded";
import { refreshTestingTranslations } from "@/lib/testing-readout-translation";
import { captureTestingChannelInputs, refreshTestingReadouts } from "@/lib/testing-readout-refresh";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim() || process.env.AI_WORKER_SECRET?.trim();
  if (!secret) return Response.json({ error: "An internal refresh secret is not configured." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = await request.json().catch(() => ({}));
    if(input.snapshotOnly===true){const presets=(input.presets??['wtd','mtd']).filter((value:unknown)=>['lastWeek','wtd','mtd'].includes(String(value)));if(!presets.length)return Response.json({error:'No supported periods.'},{status:400});return Response.json(await captureTestingChannelInputs(presets),{headers:{'Cache-Control':'no-store'}});}
    const analysis = input.translationsOnly === true ? null : input.concludedOnly === true ? await refreshConcludedTestingReadouts() : await refreshTestingReadouts();
    const result = analysis && (analysis.pending || input.analysisOnly === true) ? analysis : { ...analysis, ...await refreshTestingTranslations() };
    return Response.json(result, { status: result.pending ? 202 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Testing readout refresh failed." }, { status: 500 });
  }
}
