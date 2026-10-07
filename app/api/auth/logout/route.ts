import { NextResponse } from "next/server";
import { SESSION_COOKIE, OAUTH_COOKIE, authCookieOptions, authOrigin } from "@/lib/site-auth";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== authOrigin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const response = NextResponse.redirect(new URL("/access", authOrigin()), 303);
  for (const name of [SESSION_COOKIE, OAUTH_COOKIE, "emw3_access"]) response.cookies.set(name, "", authCookieOptions(0));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
