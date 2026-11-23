import { NextResponse, type NextRequest } from "next/server";
import { scriptLabCompanySignIn, scriptLabGoogleOrigin, scriptLabGoogleReturnTo } from "@/lib/script-lab-google";

export function GET(request: NextRequest) {
  const origin = scriptLabGoogleOrigin(request.headers.get("host") ?? "");
  if (!origin) return new NextResponse(null, { status: 404 });
  const returnTo = scriptLabGoogleReturnTo(request.nextUrl.searchParams.get("returnTo"));
  return NextResponse.redirect(scriptLabCompanySignIn(origin, returnTo), { headers: { "Cache-Control": "no-store" } });
}
