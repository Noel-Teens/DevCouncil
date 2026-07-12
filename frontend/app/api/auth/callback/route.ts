import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", request.url));
  }

  try {
    // Forward the OAuth code to our backend
    const res = await fetch(`${BACKEND_URL}/api/auth/github/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "OAuth failed" }));
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(err.detail || "OAuth failed")}`, request.url)
      );
    }

    const data = await res.json();
    const token = data.access_token;

    // Redirect into the app with the token (AuthProvider picks it up + cleans the URL)
    const redirectUrl = new URL("/dashboard", request.url);
    redirectUrl.searchParams.set("auth_token", token);
    return NextResponse.redirect(redirectUrl);
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=server_error", request.url)
    );
  }
}
