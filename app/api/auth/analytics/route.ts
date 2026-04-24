import { NextRequest, NextResponse } from "next/server";

const ANALYTICS_USERNAME = "thence_demo";
const ANALYTICS_PASSWORD = "Thence#Admin";
const COOKIE_NAME = "analytics_auth";
const COOKIE_VALUE = "authenticated";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (username === ANALYTICS_USERNAME && password === ANALYTICS_PASSWORD) {
      const response = NextResponse.json({ success: true });
      response.cookies.set(COOKIE_NAME, COOKIE_VALUE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      });
      return response;
    }

    return NextResponse.json(
      { success: false, error: "Invalid credentials" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(COOKIE_NAME);
  const authenticated = cookie?.value === COOKIE_VALUE;
  return NextResponse.json({ authenticated });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
