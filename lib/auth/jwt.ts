import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

function getJwtSecret(): string {
  return process.env.JWT_SECRET ?? "";
}
const TOKEN_EXPIRY = "7d";
const COOKIE_NAME = "fuega_token";

export interface JwtPayload {
  userId: string;
  username: string;
}

/**
 * Sign a JWT with userId and username.
 */
export function signToken(payload: JwtPayload): string {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.sign(payload, secret, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verify and decode a JWT. Returns payload or null on failure.
 */
export function verifyToken(token: string): JwtPayload | null {
  const secret = getJwtSecret();
  if (!secret) return null;
  try {
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload &
      JwtPayload;
    return { userId: decoded.userId, username: decoded.username };
  } catch {
    return null;
  }
}

/**
 * Set the auth cookie with the JWT.
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: "/",
  });
}

/**
 * Clear the auth cookie.
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

/**
 * Read the JWT from the request cookie and verify it.
 * Returns payload or null if not authenticated.
 */
export async function getAuthFromCookies(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Read the JWT from an Authorization header (Bearer token).
 */
export function getAuthFromHeader(req: Request): JwtPayload | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  return verifyToken(token);
}

/**
 * Authenticate from request — tries cookie first, then header.
 */
export async function authenticate(
  req: Request
): Promise<JwtPayload | null> {
  const fromHeader = getAuthFromHeader(req);
  if (fromHeader) return fromHeader;
  return getAuthFromCookies();
}
