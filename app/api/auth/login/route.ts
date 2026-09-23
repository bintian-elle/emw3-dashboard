import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { ACCESS_COOKIE, ACCESS_COOKIE_MAX_AGE, accessToken, safeReturnPath } from "@/lib/site-auth";

function matches(candidate: unknown, secret: string) {
  if (typeof candidate !== "string") return false;
  const candidateBytes = Buffer.from(candidate);
  const secretBytes = Buffer.from(secret);
  return candidateBytes.length === secretBytes.length && timingSafeEqual(candidateBytes, secretBytes);
}

export async function POST(request: Request) {
  const secret = process.env.SITE_ACCESS_KEY?.trim();
  if (!secret) return NextResponse.json({ error: "Site access is not configured." }, { status: 503 });

  const body = await request.json().catch(() => null) as { key?: unknown; returnTo?: unknown } | null;
  if (!matches(body?.key, secret)) {
    return NextResponse.json({ error: "The access key is incorrect." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, returnTo: safeReturnPath(body?.returnTo) });
  response.cookies.set({
    name: ACCESS_COOKIE,
    value: await accessToken(secret),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
  return response;
}
