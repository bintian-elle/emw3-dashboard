import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { allowedGoogleUser, OAUTH_COOKIE, SESSION_COOKIE, SESSION_MAX_AGE, verifyAuthPayload, signAuthPayload, safeReturnPath, authCookieOptions, authOrigin, googleCredentials } from "@/lib/site-auth";

const keys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
export async function GET(request: NextRequest) {
  const fail = (error: string) => {
    const response = NextResponse.redirect(new URL(`/access?error=${error}`, authOrigin()));
    response.cookies.set(OAUTH_COOKIE, "", authCookieOptions(0));
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
  try {
    const cookie = request.cookies.get(OAUTH_COOKIE)?.value;
    if (!cookie) return fail("login");
    const state = await verifyAuthPayload(cookie, "oauth-state");
    if (request.nextUrl.searchParams.get("state") !== state.state || typeof state.verifier !== "string" || typeof state.nonce !== "string") return fail("login");
    const code = request.nextUrl.searchParams.get("code");
    if (!code || request.nextUrl.searchParams.has("error")) return fail("login");
    const { clientId, clientSecret: secret } = googleCredentials();
    if (!clientId || !secret) return fail("configuration");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: secret, redirect_uri: `${authOrigin()}/api/auth/google/callback`, grant_type: "authorization_code", code_verifier: state.verifier }), cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!tokenResponse.ok) return fail("login");
    const tokens = await tokenResponse.json();
    if (typeof tokens.id_token !== "string") return fail("login");
    const { payload } = await jwtVerify(tokens.id_token, keys, { issuer: ["https://accounts.google.com", "accounts.google.com"], audience: clientId, algorithms: ["RS256"] });
    if (payload.nonce !== state.nonce) return fail("login");
    const user = allowedGoogleUser(payload);
    if (!user) return fail("domain");
    const response = NextResponse.redirect(new URL(safeReturnPath(state.returnTo), authOrigin()));
    response.cookies.set(SESSION_COOKIE, await signAuthPayload(user, "site-session", SESSION_MAX_AGE), authCookieOptions(SESSION_MAX_AGE));
    response.cookies.set(OAUTH_COOKIE, "", authCookieOptions(0));
    response.cookies.set("emw3_access", "", authCookieOptions(0));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch { return fail("login"); }
}
