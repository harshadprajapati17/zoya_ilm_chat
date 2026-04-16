import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";

  if (!isPreviewBot(userAgent) && isCrawlerUserAgent(userAgent)) {
    return new NextResponse("Crawler access is blocked.", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
