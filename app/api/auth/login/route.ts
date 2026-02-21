import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/auth/validation";
import { verifyPassword } from "@/lib/auth/password";
import { signToken, setAuthCookie } from "@/lib/auth/jwt";
import { hashIp, getClientIp } from "@/lib/auth/ip-hash";
import { checkLoginRateLimit } from "@/lib/auth/rate-limit";
import { queryOne } from "@/lib/db";

export async function POST(req: Request) {
  try {
    // Parse and validate input
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Invalid input";
      return NextResponse.json(
        { error: firstError, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;

    // Rate limit by IP hash
    const ip = getClientIp(req);
    const ipHash = hashIp(ip);
    const rateLimit = await checkLoginRateLimit(ipHash);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many login attempts. Try again later.",
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    // Look up user
    const user = await queryOne<{
      id: string;
      username: string;
      password_hash: string;
      is_banned: boolean;
      ban_reason: string | null;
      founder_badge_number: number | null;
      post_sparks: number;
      comment_sparks: number;
      created_at: string;
    }>(
      `SELECT id, username, password_hash, is_banned, ban_reason,
              founder_badge_number, post_sparks, comment_sparks, created_at
       FROM users
       WHERE LOWER(username) = LOWER($1) AND deleted_at IS NULL`,
      [username]
    );

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    // Check ban status
    if (user.is_banned) {
      return NextResponse.json(
        {
          error: "Account is banned",
          code: "ACCOUNT_BANNED",
        },
        { status: 403 }
      );
    }

    // Verify password
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid username or password", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    // Update last login and IP hash
    await queryOne(
      "UPDATE users SET last_login_at = NOW(), ip_address_hash = $1, ip_last_seen = NOW() WHERE id = $2",
      [ipHash, user.id]
    );

    // Generate JWT and set cookie
    const token = signToken({ userId: user.id, username: user.username });
    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        founderBadgeNumber: user.founder_badge_number,
        sparkScore: user.post_sparks + user.comment_sparks,
        createdAt: user.created_at,
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
