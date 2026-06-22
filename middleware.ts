import { NextRequest, NextResponse } from "next/server";

// Protects the server-side JWT signing endpoint from cross-origin callers.
// A browser script on another origin cannot forge a signing request.
export function middleware(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname === "/api/auth/sign-token") {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/auth/sign-token"],
};
