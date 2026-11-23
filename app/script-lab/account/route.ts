import { NextResponse, type NextRequest } from "next/server";
import {
  accountAttemptAllowed, requestScriptLabVerification, scriptLabCookieOptions, signInScriptLab, signOutScriptLab, verifyScriptLabEmail,
} from "@/lib/script-lab-account";
import { isLocalScriptLabHost, scriptLabCookie, SCRIPT_LAB_COMPANY_COOKIE, SCRIPT_LAB_PUBLIC_HOST } from "@/lib/script-lab-host";

import { clearSiteSession } from "@/lib/site-logout";

function reply(status: number, error?: string) {
  return NextResponse.json(error ? { error } : { ok: true }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase() ?? "";
  const local = isLocalScriptLabHost(host);
  if (!local && host !== SCRIPT_LAB_PUBLIC_HOST) return reply(404);
  const origin = local ? `http://${host}` : `https://${SCRIPT_LAB_PUBLIC_HOST}`;
  if (request.headers.get("origin") !== origin) return reply(403, "Request origin could not be verified.");
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return reply(415);
  const reader = request.body?.getReader();
  if (!reader) return reply(400);
  let size = 0;
  const chunks: Buffer[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2048) {
      await reader.cancel();
      return reply(413);
    }
    chunks.push(Buffer.from(value));
  }

  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return reply(400, "Invalid request."); }
  if (typeof body !== "object" || !body || !("action" in body)) return reply(400);

  try {
    if (body.action === "logout") {
      await signOutScriptLab(request.cookies.get(scriptLabCookie)?.value);
      const response = reply(200);
      response.cookies.set(scriptLabCookie, "", { ...scriptLabCookieOptions, maxAge: 0 });
      if ("company" in body && body.company === true) {
        if (local) clearSiteSession(response);
        else response.cookies.set(SCRIPT_LAB_COMPANY_COOKIE, "", { ...scriptLabCookieOptions, secure: true, maxAge: 0 });
      }
      return response;
    }

    const password = "password" in body && typeof body.password === "string" ? body.password : "";
    if (body.action === "verify") {
      const token = "token" in body && typeof body.token === "string" ? body.token : "";
      if (password.length < 12 || password.length > 128) return reply(400, "Use a password between 12 and 128 characters.");
      return await verifyScriptLabEmail(token, password)
        ? reply(200) : reply(400, "The password is incorrect, or the verification link is invalid or expired.");
    }

    if (body.action !== "register" && body.action !== "login") return reply(400);
    const email = "email" in body && typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, "Enter a valid email address.");
    if (password.length < 12 || password.length > 128) return reply(400, "Use a password between 12 and 128 characters.");
    if (body.action === "register" && (!("passwordConfirmation" in body) || body.passwordConfirmation !== password)) {
      return reply(400, "The passwords do not match.");
    }
    if (!await accountAttemptAllowed(email)) return reply(429, "Too many attempts. Please try again in 15 minutes.");

    if (body.action === "register") {
      await requestScriptLabVerification(email, origin, password);
      return reply(202);
    }

    const token = await signInScriptLab(email, password);
    if (!token) return reply(400, "Sign-in failed. Check your password and verify your email first.");
    const response = reply(200);
    response.cookies.set(scriptLabCookie, token, scriptLabCookieOptions);
    return response;
  } catch {
    return reply(503, body.action === "register"
      ? "Verification email could not be sent. Please try again later."
      : "Accounts are temporarily unavailable. Please try again shortly.");
  }
}
