/**
 * Next.js Middleware — CSRF validation for state-changing requests.
 *
 * Runs before every API route. Validates CSRF token on POST/PUT/PATCH/DELETE.
 * Skips CSRF for auth endpoints (login/signup) since they use rate limiting
 * and the user doesn't have a CSRF cookie yet.
 */

import { NextResponse, type NextRequest } from "next/server";

const CSRF_COOKIE = "fuega_csrf";
const CSRF_HEADER = "x-csrf-token";

/** Routes exempt from CSRF (pre-auth endpoints) */
const CSRF_EXEMPT = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
];

export function middleware(req: NextRequest) {
  const method = req.method.toUpperCase();

  // Safe methods don't need CSRF
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return NextResponse.next();
  }

  // Only apply to API routes
  const pathname = req.nextUrl.pathname;
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Skip CSRF for exempt routes
  if (CSRF_EXEMPT.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Validate CSRF token
  const tokenFromHeader = req.headers.get(CSRF_HEADER);
  const tokenFromCookie = req.cookies.get(CSRF_COOKIE)?.value;

  if (!tokenFromHeader || !tokenFromCookie) {
    return NextResponse.json(
      { error: "Missing CSRF token", code: "CSRF_ERROR" },
      { status: 403 }
    );
  }

  // Constant-time-ish comparison (Edge runtime doesn't have crypto.timingSafeEqual)
  if (tokenFromHeader.length !== tokenFromCookie.length) {
    return NextResponse.json(
      { error: "Invalid CSRF token", code: "CSRF_ERROR" },
      { status: 403 }
    );
  }

  let mismatch = 0;
  for (let i = 0; i < tokenFromHeader.length; i++) {
    mismatch |= tokenFromHeader.charCodeAt(i) ^ tokenFromCookie.charCodeAt(i);
  }

  if (mismatch !== 0) {
    return NextResponse.json(
      { error: "Invalid CSRF token", code: "CSRF_ERROR" },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
