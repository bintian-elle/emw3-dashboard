import { isLocalScriptLabHost, scriptLabCookie, scriptLabLanguageCookie, SCRIPT_LAB_COMPANY_COOKIE, SCRIPT_LAB_LOCAL_COMPANY_COOKIE, SCRIPT_LAB_PUBLIC_HOST } from "@/lib/script-lab-host";
import { isPublicScriptLabSectionPath } from "@/lib/script-lab-navigation";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession, safeReturnPath } from "@/lib/site-auth";
import { testingDocumentPeriodRedirect } from "@/lib/testing-navigation";
import {reviewPreviewEnabled,reviewPreviewRequestAllowed} from '@/lib/review-access';

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
  const target = testingDocumentPeriodRedirect(path, request.method, request.headers, true);
  if (!target) return null;
  const response = NextResponse.redirect(new URL(target, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get("host")?.toLowerCase() ?? "";
  const publicScriptLabHost = host === SCRIPT_LAB_PUBLIC_HOST;
  const scriptLabPage = pathname === "/script-lab" || isPublicScriptLabSectionPath(pathname);
  const scriptLabVerify = pathname === "/script-lab/verify";
  const scriptLabRules = pathname === "/script-lab/rules";
  const scriptLabBaselines = pathname === "/script-lab/baselines";
  const scriptLabPrepare = pathname === "/script-lab/prepare";
  const scriptLabReviews = pathname === "/script-lab/reviews";
  const scriptLabTrendFeed = pathname === "/script-lab/trend-feed";
  const scriptLabTrendMedia = /^\/script-lab\/trend-media\/\d{15,24}$/.test(pathname);
  const scriptLabHistory = pathname === "/script-lab/rule-history";
  const scriptLabGoogle = pathname === "/script-lab/auth/google";
  const scriptLabCompany = pathname === "/script-lab/company-session";
  const scriptLabAccount = pathname === "/script-lab/account";
  const publicScriptLabLogo = pathname === "/brand/biceek-wordmark.png" || pathname === "/brand/emw3-wordmark.png";
  if (publicScriptLabHost || (isLocalScriptLabHost(host) && (scriptLabPage || scriptLabVerify || scriptLabAccount || scriptLabRules || scriptLabBaselines || scriptLabPrepare || scriptLabReviews || scriptLabTrendFeed || scriptLabTrendMedia || scriptLabHistory || scriptLabGoogle || publicScriptLabLogo))) {
    const read = request.method === "GET" || request.method === "HEAD";
    const asset = publicScriptLabLogo || /^\/ai-tools\/script-lab\/(?:commute|home|shop|travel|reveal)\.webp$/.test(pathname);
    const rulesWrite = scriptLabRules && ["POST", "PATCH", "DELETE"].includes(request.method);
    if (!(read && (scriptLabPage || scriptLabVerify || scriptLabRules || scriptLabBaselines || scriptLabPrepare || scriptLabReviews || scriptLabTrendFeed || scriptLabTrendMedia || scriptLabHistory || scriptLabGoogle || asset))
      && !(request.method === "POST" && (scriptLabAccount || scriptLabPrepare || scriptLabReviews))
      && !(scriptLabCompany && ["POST", "DELETE"].includes(request.method)) && !rulesWrite) {
      return new NextResponse(null, { status: 404 });
    }
    const headers = new Headers(request.headers);
    const customerSession = request.cookies.get(scriptLabCookie)?.value;
    const customerCookies: string[] = [];
    const companyCookieName = publicScriptLabHost ? SCRIPT_LAB_COMPANY_COOKIE : SESSION_COOKIE;
    const companyCookie = request.cookies.get(companyCookieName)?.value;
    if ((scriptLabPage || scriptLabRules || scriptLabPrepare || scriptLabReviews || scriptLabHistory) && companyCookie && /^[A-Za-z0-9_.-]{1,2048}$/.test(companyCookie)) {
      customerCookies.push(`${publicScriptLabHost ? companyCookieName : SCRIPT_LAB_LOCAL_COMPANY_COOKIE}=${companyCookie}`);
    }
    const customerLanguage = request.cookies.get(scriptLabLanguageCookie)?.value;
    headers.delete("cookie");
    headers.delete("authorization");
    if ((scriptLabPage || scriptLabAccount || scriptLabRules || scriptLabPrepare || scriptLabReviews || scriptLabHistory) && customerSession && /^[a-f0-9]{64}$/.test(customerSession)) {
      customerCookies.push(`${scriptLabCookie}=${customerSession}`);
    }
    if ((scriptLabPage || scriptLabVerify || scriptLabHistory) && (customerLanguage === "en" || customerLanguage === "zh")) {
      customerCookies.push(`${scriptLabLanguageCookie}=${customerLanguage}`);
    }
    if (customerCookies.length) headers.set("cookie", customerCookies.join("; "));
    const response = NextResponse.next({ request: { headers } });
    if (!asset && !scriptLabTrendMedia) response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  if (scriptLabPage || scriptLabVerify || scriptLabAccount || scriptLabRules || scriptLabBaselines || scriptLabPrepare || scriptLabReviews || scriptLabTrendFeed || scriptLabTrendMedia || scriptLabHistory || scriptLabCompany || scriptLabGoogle) return new NextResponse(null, { status: 404 });
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
  if ((pathname === "/api/script-lab/company-session" && request.method === "GET")
    || (pathname === "/api/script-lab/company-logout" && request.method === "POST")) return NextResponse.next();
  if (publicPaths.has(pathname)) return NextResponse.next();

  const testingScheduledPost = request.method === "POST" && (pathname === "/api/testing/readouts/refresh" || pathname === "/api/testing/social-refresh" || pathname === "/api/testing/data-refresh" || pathname === "/api/testing/history/generate");
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
  if(reviewPreviewEnabled(authorized,request.cookies.get('review_preview')?.value)&&!reviewPreviewRequestAllowed(request.method,pathname))return NextResponse.json({error:'This action is unavailable in preview mode.'},{status:403,headers:{'Cache-Control':'private, no-store'}});
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
