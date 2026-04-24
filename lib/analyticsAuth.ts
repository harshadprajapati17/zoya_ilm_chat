import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "analytics_auth";
const COOKIE_VALUE = "authenticated";

export function isAnalyticsAuthenticated(request: NextRequest): boolean {
  return request.cookies.get(COOKIE_NAME)?.value === COOKIE_VALUE;
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Authentication required" },
    { status: 401 }
  );
}
