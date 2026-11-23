import { NextResponse, type NextRequest } from "next/server";
import { currentSiteUser } from "@/lib/current-site-user";
import { makeCompanyGrant } from "@/lib/script-lab-company-session";
import { SCRIPT_LAB_COMPANY_ORIGIN, SCRIPT_LAB_PUBLIC_HOST } from "@/lib/script-lab-host";

export async function GET(request: NextRequest) {
  const origin = `https://${SCRIPT_LAB_PUBLIC_HOST}`;
  const companyHost = new URL(SCRIPT_LAB_COMPANY_ORIGIN).hostname;
  if (request.headers.get("origin") !== origin || request.headers.get("host") !== companyHost) {
    return new NextResponse(null, { status: 403 });
  }
  const user = await currentSiteUser();
  const headers = { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true", "Cache-Control": "no-store", Vary: "Origin" };
  if (!user) return new NextResponse(null, { status: 401, headers });
  return NextResponse.json({ grant: await makeCompanyGrant(user) }, { headers });
}
