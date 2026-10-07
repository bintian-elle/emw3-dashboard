import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession, safeReturnPath } from "@/lib/site-auth";

const crawlerPattern = /(?:googlebot|bingbot|duckduckbot|baiduspider|yandexbot|gptbot|chatgpt-user|oai-searchbot|claudebot|claude-web|anthropic-ai|ccbot|perplexitybot|google-extended|bytespider|amazonbot|applebot-extended|cohere-ai|meta-externalagent|meta-externalfetch)/i;
const publicPaths = new Set(["/access", "/api/auth/login", "/api/auth/google", "/api/auth/google/callback", "/robots.txt"]);

function blockedResponse() {
  return new NextResponse("Automated crawling is not permitted.", {
    status: 403,
    headers: { "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai" },
  });
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (crawlerPattern.test(request.headers.get("user-agent") || "")) return blockedResponse();
  if (publicPaths.has(pathname)) return NextResponse.next();

  if (pathname === "/api/klaviyo/insights/refresh") {
    const cronSecret = process.env.CRON_SECRET?.trim();
    if (cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`) return NextResponse.next();
  }

  // Service credentials only authorize the worker's summary endpoint.
  if (pathname === "/api/klaviyo/ask" && request.method === "POST") {
    const workerSecret = process.env.AI_WORKER_SECRET?.trim();
    if (workerSecret && request.headers.get("authorization") === `Bearer ${workerSecret}`) {
      const body = await request.clone().json().catch(() => null);
      if (body?.mode === "summary") return NextResponse.next();
    }
  }
  const authorized = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (authorized) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessUrl = new URL("/access", request.url);
  accessUrl.searchParams.set("returnTo", safeReturnPath(`${pathname}${request.nextUrl.search}`));
  return NextResponse.redirect(accessUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico).*)"],
};
