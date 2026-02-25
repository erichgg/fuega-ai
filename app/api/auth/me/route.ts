import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { checkReadRateLimit } from "@/lib/auth/rate-limit";
import { hashIp, getClientIp } from "@/lib/auth/ip-hash";
import { queryOne } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const ipHash = hashIp(getClientIp(req));
    const rateLimit = await checkReadRateLimit(ipHash);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const auth = await authenticate(req);
    if (!auth) {
      return NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const user = await queryOne<{
      id: string;
      username: string;
      founder_number: number | null;
      post_glow: number;
      comment_glow: number;
      created_at: string;
    }>(
      `SELECT id, username, founder_number, post_glow, comment_glow, created_at
       FROM users
       WHERE id = $1 AND deleted_at IS NULL AND is_banned = false`,
      [auth.userId]
    );

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const glow = user.post_glow + user.comment_glow;
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        founderBadgeNumber: user.founder_number,
        glow,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error("Me error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
