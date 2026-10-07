import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "emw3_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
export const OAUTH_COOKIE = "emw3_oauth";
export const ALLOWED_DOMAIN = "elle-media.com";
export type SiteUser = { sub: string; email: string; name: string };

function signingKey() {
  const secret = (process.env.AUTH_SECRET || process.env.GOOGLE_LOGIN_AUTH_SECRET)?.trim();
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters.");
  return new TextEncoder().encode(secret);
}

export async function signAuthPayload(payload: Record<string, unknown>, purpose: string, seconds: number) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuer("emw3-dashboard").setAudience(purpose).setIssuedAt().setExpirationTime(`${seconds}s`).sign(signingKey());
}
export async function verifyAuthPayload(token: string, purpose: string) {
  return (await jwtVerify(token, signingKey(), { algorithms: ["HS256"], issuer: "emw3-dashboard", audience: purpose })).payload;
}
export function allowedGoogleUser(claims: Record<string, unknown>): SiteUser | null {
  if (typeof claims.sub !== "string" || !claims.sub || typeof claims.email !== "string" || claims.email_verified !== true || claims.hd !== ALLOWED_DOMAIN) return null;
  const email = claims.email.toLowerCase();
  if (email.split("@").length !== 2 || email.split("@")[1] !== ALLOWED_DOMAIN) return null;
  return { sub: claims.sub, email, name: typeof claims.name === "string" && claims.name.trim() ? claims.name : email.split("@")[0] };
}
export async function readSession(token?: string): Promise<SiteUser | null> {
  if (!token) return null;
  try {
    const claims = await verifyAuthPayload(token, "site-session");
    if (typeof claims.sub !== "string" || typeof claims.email !== "string" || typeof claims.name !== "string" || claims.email.split("@")[1] !== ALLOWED_DOMAIN) return null;
    return { sub: claims.sub, email: claims.email, name: claims.name };
  } catch { return null; }
}
export function safeReturnPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\x00-\x1f]/.test(value)) return "/";
  return value;
}
export function authCookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge };
}
export function authOrigin() {
  const url = new URL(process.env.AUTH_URL || process.env.GOOGLE_LOGIN_AUTH_URL || "http://localhost:3000");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("AUTH_URL must use HTTPS in production.");
  return url.origin;
}

export function googleCredentials() {
  return {
    clientId: (process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_LOGIN_CLIENT_ID)?.trim(),
    clientSecret: (process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_LOGIN_CLIENT_SECRET)?.trim(),
  };
}
