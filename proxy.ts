import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, accessToken, safeReturnPath } from "@/lib/site-auth";

const crawlerPattern = /(?:googlebot|bingbot|duckduckbot|baiduspider|yandexbot|gptbot|chatgpt-user|oai-searchbot|claudebot|claude-web|anthropic-ai|ccbot|perplexitybot|google-extended|bytespider|amazonbot|applebot-extended|cohere-ai|meta-externalagent|meta-externalfetch)/i;
const publicPaths = new Set(["/access", "/api/auth/login", "/robots.txt"]);

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

  const secret = process.env.SITE_ACCESS_KEY?.trim();
  const cookie = request.cookies.get(ACCESS_COOKIE)?.value;
  const authorized = Boolean(secret && cookie && cookie === await accessToken(secret));
  if (authorized) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessUrl = new URL("/access", request.url);
  accessUrl.searchParams.set("returnTo", safeReturnPath(`${pathname}${request.nextUrl.search}`));
  return NextResponse.redirect(accessUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?)$).*)"],
};
