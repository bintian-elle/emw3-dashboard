import { NextResponse, type NextRequest } from "next/server";
import { companySessionAge, exchangeCompanyGrant } from "@/lib/script-lab-company-session";
import { SCRIPT_LAB_COMPANY_COOKIE, SCRIPT_LAB_PUBLIC_HOST } from "@/lib/script-lab-host";

function allowed(request: NextRequest) {
  return request.headers.get("host") === SCRIPT_LAB_PUBLIC_HOST
    && request.headers.get("origin") === `https://${SCRIPT_LAB_PUBLIC_HOST}`;
}

const cookieOptions = { secure: true, httpOnly: true, sameSite: "lax", path: "/" } as const;

export async function POST(request: NextRequest) {
  if (!allowed(request)) return new NextResponse(null, { status: 403 });
  const body = await request.json().catch(() => null);
  const grant = body?.grant;
  const session = typeof grant === "string" && grant.length <= 2048 ? await exchangeCompanyGrant(grant) : null;
  if (!session) return new NextResponse(null, { status: 401 });
  const response = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  response.cookies.set(SCRIPT_LAB_COMPANY_COOKIE, session, {
    ...cookieOptions, maxAge: companySessionAge,
  });
  return response;
}


export function DELETE(request: NextRequest) {
  if (!allowed(request)) return new NextResponse(null, { status: 403 });
  const response = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  response.cookies.set(SCRIPT_LAB_COMPANY_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
