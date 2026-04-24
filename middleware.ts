import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ANALYTICS_AUTH_USERNAME = "thence_demo";
const ANALYTICS_AUTH_PASSWORD = "Thence#Admin";

const CRAWLER_PATTERNS = [
  "bot",
  "crawler",
  "spider",
  "slurp",
  "curl",
  "wget",
  "python-requests",
  "httpclient",
];

const PREVIEW_BOT_ALLOWLIST = [
  "whatsapp",
  "facebookexternalhit",
  "facebot",
  "twitterbot",
  "linkedinbot",
  "slackbot",
  "discordbot",
  "telegrambot",
];

function isPreviewBot(userAgent: string): boolean {
  const normalizedUserAgent = userAgent.toLowerCase();
  return PREVIEW_BOT_ALLOWLIST.some((bot) =>
    normalizedUserAgent.includes(bot)
  );
}

function isCrawlerUserAgent(userAgent: string): boolean {
  const normalizedUserAgent = userAgent.toLowerCase();
  return CRAWLER_PATTERNS.some((pattern) =>
    normalizedUserAgent.includes(pattern)
  );
}

function isAnalyticsPath(pathname: string): boolean {
  return (
    pathname === "/analytics" ||
    pathname.startsWith("/analytics/") ||
    pathname === "/dashboard/analytics" ||
    pathname.startsWith("/dashboard/analytics/")
  );
}

function isAuthenticated(request: NextRequest): boolean {
  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Basic ")) {
    return false;
  }

  try {
    const encoded = authorization.split(" ")[1];
    const decoded = atob(encoded);
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) return false;

    const username = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);

    return (
      username === ANALYTICS_AUTH_USERNAME &&
      password === ANALYTICS_AUTH_PASSWORD
    );
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent") ?? "";

  if (isAnalyticsPath(pathname) && !isAuthenticated(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/api/basicauth";
    return NextResponse.rewrite(url);
  }

  if (!isPreviewBot(userAgent) && isCrawlerUserAgent(userAgent)) {
    return new NextResponse("Crawler access is blocked.", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
