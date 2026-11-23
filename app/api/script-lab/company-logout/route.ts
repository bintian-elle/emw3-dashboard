import { NextResponse, type NextRequest } from "next/server";
import { SCRIPT_LAB_COMPANY_ORIGIN, SCRIPT_LAB_PUBLIC_HOST } from "@/lib/script-lab-host";
import { clearSiteSession } from "@/lib/site-logout";

export function POST(request: NextRequest) {
  const origin = `https://${SCRIPT_LAB_PUBLIC_HOST}`;
  if (request.headers.get("host") !== new URL(SCRIPT_LAB_COMPANY_ORIGIN).hostname
    || request.headers.get("origin") !== origin) {
    return new NextResponse(null, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const response = new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Cache-Control": "no-store",
      "Vary": "Origin",
    },
  });
  clearSiteSession(response);
  return response;
}
