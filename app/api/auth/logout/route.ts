import { NextResponse } from "next/server";
import { authOrigin } from "@/lib/site-auth";
import { clearSiteSession } from "@/lib/site-logout";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== authOrigin(request.url)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const response = NextResponse.redirect(new URL("/access", authOrigin(request.url)), 303);
  clearSiteSession(response);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
