import { NextRequest, NextResponse } from "next/server";
import { getGoogleAdsDashboard } from "@/lib/google-ads";

export async function GET(request: NextRequest) {
  const days = Number(request.nextUrl.searchParams.get("days") ?? 30);
  const comparison = request.nextUrl.searchParams.get("comparison") === "YOY" ? "YOY" : "POP";
  const start = request.nextUrl.searchParams.get("start") ?? undefined;
  const end = request.nextUrl.searchParams.get("end") ?? undefined;
  const brandFilter = request.nextUrl.searchParams.get("brand") ?? undefined;
  const requestedSearchTermSort = request.nextUrl.searchParams.get("searchSort");
  const searchTermSort = requestedSearchTermSort === "spend" || requestedSearchTermSort === "spend_movers" || requestedSearchTermSort === "conversion_movers" ? requestedSearchTermSort : "conversions";
  try {
    const data = await getGoogleAdsDashboard({ days, comparison, start, end, brandFilter, searchTermSort });
    return NextResponse.json(data, { headers: { "Cache-Control": "private, max-age=0, must-revalidate" } });
  } catch (error) {
    console.error("Google Ads overview query failed", error);
    return NextResponse.json({ error: "Dashboard data is temporarily unavailable." }, { status: 500 });
  }
}
