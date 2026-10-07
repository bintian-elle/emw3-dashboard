import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { ALLOWED_DOMAIN, OAUTH_COOKIE, signAuthPayload, safeReturnPath, authCookieOptions, authOrigin, googleCredentials } from "@/lib/site-auth";

export async function GET(request: Request) {
  const { clientId, clientSecret } = googleCredentials();
  if (!clientId || !clientSecret) return NextResponse.redirect(new URL("/access?error=configuration", request.url));
  try {
    const state = randomBytes(32).toString("base64url"), nonce = randomBytes(32).toString("base64url"), verifier = randomBytes(32).toString("base64url");
    const returnTo = safeReturnPath(new URL(request.url).searchParams.get("returnTo"));
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({ client_id: clientId, redirect_uri: `${authOrigin()}/api/auth/google/callback`, response_type: "code", scope: "openid email profile", state, nonce, hd: ALLOWED_DOMAIN, prompt: "select_account", code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
    const response = NextResponse.redirect(url);
    response.cookies.set(OAUTH_COOKIE, await signAuthPayload({ state, nonce, verifier, returnTo }, "oauth-state", 600), authCookieOptions(600));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch { return NextResponse.redirect(new URL("/access?error=configuration", request.url)); }
}
