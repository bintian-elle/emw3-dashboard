import { NextResponse, type NextRequest } from "next/server";
import { currentSiteUser } from "@/lib/current-site-user";
import { SCRIPT_LAB_COMPANY_ORIGIN, SCRIPT_LAB_PUBLIC_HOST } from "@/lib/script-lab-host";
import { scriptLabGoogleReturnTo } from "@/lib/script-lab-google";

export async function GET(request: NextRequest) {
  const companyHost = new URL(SCRIPT_LAB_COMPANY_ORIGIN).hostname;
  if (request.headers.get("host") !== companyHost || !await currentSiteUser()) {
    return new NextResponse(null, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const destination = scriptLabGoogleReturnTo(request.nextUrl.searchParams.get("view"));
  const url = new URL(destination, `https://${SCRIPT_LAB_PUBLIC_HOST}`);
  return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store" } });
}
