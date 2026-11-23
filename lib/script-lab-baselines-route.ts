import { NextResponse, type NextRequest } from "next/server";
import { getBaselineVersion, loadBaselineSnapshot, loadScriptLabBaselines } from "./script-lab-baseline-store";
import { isBaselineCode } from "./script-lab-baselines";
import { getScriptLabRuleActor } from "./script-lab-rule-access";

export async function getBaselines(request: NextRequest, visibility: "public" | "internal") {
  const headers = { "Cache-Control": "private, no-store" };
  const code = request.nextUrl.searchParams.get("code") ?? "#01";
  if (!isBaselineCode(code)) return NextResponse.json({ error: "invalid_code" }, { status: 400, headers });
  try {
    if (visibility === "internal" && !await getScriptLabRuleActor("internal", request.headers.get("host") ?? "")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403, headers });
    }
    const view = request.nextUrl.searchParams.get("view");
    const result = view === "version" ? { version: await getBaselineVersion(visibility) }
      : view === "snapshot" ? await loadBaselineSnapshot(visibility)
      : await loadScriptLabBaselines(code, visibility);
    return NextResponse.json(result, { headers });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers });
  }
}
