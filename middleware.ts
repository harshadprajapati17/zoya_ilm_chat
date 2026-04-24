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
    pathname.startsWith("/dashboard/analytics/") ||
    pathname === "/api/analytics" ||
    pathname.startsWith("/api/analytics/")
  );
}

function unauthorizedResponse(
  pathname: string,
  request: NextRequest
): NextResponse {
  const isPrefetchOrFetch =
    pathname.startsWith("/api/analytics") ||
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("rsc") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose")?.includes("prefetch");

  if (isPrefetchOrFetch) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Analytics", charset="UTF-8"',
    },
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent") ?? "";

  if (isAnalyticsPath(pathname)) {
    const authorization = request.headers.get("authorization");
    if (!authorization || !authorization.startsWith("Basic ")) {
      return unauthorizedResponse(pathname, request);
    }

    const encodedCredentials = authorization.split(" ")[1];
    let decodedCredentials = "";
    try {
      decodedCredentials = atob(encodedCredentials);
    } catch {
      return unauthorizedResponse(pathname, request);
    }
    const separatorIndex = decodedCredentials.indexOf(":");

    if (separatorIndex === -1) {
      return unauthorizedResponse(pathname, request);
    }

    const username = decodedCredentials.slice(0, separatorIndex);
    const password = decodedCredentials.slice(separatorIndex + 1);

    if (
      username !== ANALYTICS_AUTH_USERNAME ||
      password !== ANALYTICS_AUTH_PASSWORD
    ) {
      return unauthorizedResponse(pathname, request);
    }
  }

  if (!isPreviewBot(userAgent) && isCrawlerUserAgent(userAgent)) {
    return new NextResponse("Crawler access is blocked.", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
