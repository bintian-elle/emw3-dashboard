import { loadTrendFeed } from "@/lib/script-lab-trend-store";

export async function GET() {
  try {
    return Response.json(await loadTrendFeed(), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "trend_feed_unavailable" }, { status: 503 });
  }
}
