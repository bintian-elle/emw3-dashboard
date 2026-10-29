import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession, safeReturnPath } from "@/lib/site-auth";
import { testingDocumentPeriodRedirect } from "@/lib/testing-navigation";

import {CODEX_SITE_COOKIE,codexReadPath,validCodexSiteToken} from "@/lib/codex-site-access";

const crawlerPattern = /(?:googlebot|bingbot|duckduckbot|baiduspider|yandexbot|gptbot|chatgpt-user|oai-searchbot|claudebot|claude-web|anthropic-ai|ccbot|perplexitybot|google-extended|bytespider|amazonbot|applebot-extended|cohere-ai|meta-externalagent|meta-externalfetch)/i;
const publicPaths = new Set(["/access", "/api/auth/login", "/api/auth/google", "/api/auth/google/callback", "/robots.txt", "/brand/emw3-logo.gif"]);

function blockedResponse() {
  return new NextResponse("Automated crawling is not permitted.", {
    status: 403,
    headers: { "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai" },
  });
}

function resetTestingDocumentPeriod(request: NextRequest) {
  const path = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const target = testingDocumentPeriodRedirect(path, request.method, request.headers);
  if (!target) return null;
  const response = NextResponse.redirect(new URL(target, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // Local-only AI tools preview; production authentication is unchanged.
  // Bundled open-source font files are static assets, not protected report data.
  if (/^\/fonts\/overpass\/(?:overpass-(?:400|500|600|700|800)\.ttf|OFL\.txt)$/.test(pathname)) return NextResponse.next();
  if (process.env.NODE_ENV === "development" && ["localhost", "127.0.0.1", "[::1]"].includes(request.nextUrl.hostname) && (pathname === "/ai-tools" || pathname.startsWith("/ai-tools/") || pathname.startsWith("/api/ai-dashboard/"))) return NextResponse.next();
  const serviceToken=request.cookies.get(CODEX_SITE_COOKIE)?.value||request.headers.get("authorization")?.replace(/^Bearer /, "");
  if(await validCodexSiteToken(serviceToken)){
    if(!codexReadPath(request.method,pathname))return NextResponse.json({error:"Codex service access is read-only."},{status:403});
    const reset=resetTestingDocumentPeriod(request);if(reset)return reset;
    const response=NextResponse.next();response.headers.set("Cache-Control","private, no-store");return response;
  }
  if (crawlerPattern.test(request.headers.get("user-agent") || "")) return blockedResponse();
  if (publicPaths.has(pathname)) return NextResponse.next();

  const testingScheduledPost = request.method === "POST" && (pathname === "/api/testing/readouts/refresh" || pathname === "/api/testing/social-refresh" || pathname === "/api/testing/data-refresh");
  if (pathname === "/api/klaviyo/insights/refresh" || testingScheduledPost) {
    const cronSecret = process.env.CRON_SECRET?.trim() || (testingScheduledPost ? process.env.AI_WORKER_SECRET?.trim() : undefined);
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
  if (authorized) return resetTestingDocumentPeriod(request) ?? NextResponse.next();

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
