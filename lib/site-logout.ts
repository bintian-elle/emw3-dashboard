import type { NextResponse } from "next/server";
import { authCookieOptions, OAUTH_COOKIE, SESSION_COOKIE } from "./site-auth";

export function clearSiteSession(response: NextResponse) {
  for (const name of [SESSION_COOKIE, OAUTH_COOKIE, "emw3_access"]) {
    response.cookies.set(name, "", authCookieOptions(0));
  }
}
