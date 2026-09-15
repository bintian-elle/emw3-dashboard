import { loadAiDetails, loadDashboard, type DashboardRequest, type DateRange } from "@/lib/klaviyo-dashboard";
import { buildPerformanceIntelligence } from "@/lib/klaviyo-analytics";

function validDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function shift(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function defaultRange(): DateRange {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const end = shift(today, -weekday);
  return { start: shift(end, -6), end };
}

function previous(range: DateRange): DateRange {
  const days = Math.round((Date.parse(`${range.end}T00:00:00Z`) - Date.parse(`${range.start}T00:00:00Z`)) / 86_400_000) + 1;
  return { start: shift(range.start, -days), end: shift(range.end, -days) };
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return Response.json({ error: "Not found" }, { status: 404 });
  const url = new URL(request.url);
  const defaults = defaultRange();
  const range: DateRange = {
    start: validDate(url.searchParams.get("start")) ? url.searchParams.get("start")! : defaults.start,
    end: validDate(url.searchParams.get("end")) ? url.searchParams.get("end")! : defaults.end,
  };
  const input: DashboardRequest = {
    range,
    comparison: previous(range),
    presetLabel: url.searchParams.get("preset") || "Last Week (Tue–Mon)",
    comparisonLabel: "Previous period",
  };
  try {
    const [data, details] = await Promise.all([loadDashboard(input), loadAiDetails(input)]);
    return Response.json({ analysis_payload: buildPerformanceIntelligence(data, details), generated_at: new Date().toISOString(), environment: process.env.NODE_ENV || "development" });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to build analysis payload." }, { status: 500 });
  }
}
