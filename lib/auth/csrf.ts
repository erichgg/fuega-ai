/**
 * CSRF protection for fuega.ai.
 *
 * Uses double-submit cookie pattern:
 * 1. Server sets a random CSRF token in a cookie
 * 2. Client reads the cookie and sends it as a header (X-CSRF-Token)
 * 3. Server verifies the header matches the cookie
 *
 * This works because:
 * - SameSite cookies prevent CSRF from other origins
 * - The header can only be set by same-origin JavaScript
 * - Cross-origin requests cannot read cookies to forge the header
 */

import { randomBytes } from "crypto";
import { cookies } from "next/headers";

const CSRF_COOKIE = "fuega_csrf";
const CSRF_HEADER = "x-csrf-token";
const TOKEN_LENGTH = 32; // 32 bytes = 64 hex chars

/**
 * Generate a new CSRF token.
 */
export function generateCsrfToken(): string {
  return randomBytes(TOKEN_LENGTH).toString("hex");
}

/**
 * Set a CSRF token cookie if not already present.
 * Returns the token value (new or existing).
 */
export async function ensureCsrfCookie(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CSRF_COOKIE)?.value;

  if (existing && existing.length === TOKEN_LENGTH * 2) {
    return existing;
  }

  const token = generateCsrfToken();
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: false, // Client JS must read this to send in header
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60, // 24 hours
    path: "/",
  });

  return token;
}

/**
 * Validate CSRF token from request.
 * Compares X-CSRF-Token header against the csrf cookie.
 *
 * Returns true if the request is valid (safe method or token matches).
 */
export async function validateCsrf(req: Request): Promise<boolean> {
  // Safe methods don't need CSRF validation
  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return true;
  }

  const tokenFromHeader = req.headers.get(CSRF_HEADER);
  const cookieStore = await cookies();
  const tokenFromCookie = cookieStore.get(CSRF_COOKIE)?.value;

  if (!tokenFromHeader || !tokenFromCookie) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (tokenFromHeader.length !== tokenFromCookie.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < tokenFromHeader.length; i++) {
    mismatch |= tokenFromHeader.charCodeAt(i) ^ tokenFromCookie.charCodeAt(i);
  }

  return mismatch === 0;
}

export { CSRF_COOKIE, CSRF_HEADER };
