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

function isCrawlerUserAgent(userAgent: string): boolean {
  const normalizedUserAgent = userAgent.toLowerCase();
  return CRAWLER_PATTERNS.some((pattern) =>
    normalizedUserAgent.includes(pattern)
  );
}

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";

  if (isCrawlerUserAgent(userAgent)) {
    return new NextResponse("Crawler access is blocked.", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
