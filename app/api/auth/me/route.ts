import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { queryOne } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const auth = await authenticate(req);
    if (!auth) {
      return NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Migration 009 renames post_sparks→post_glow, comment_sparks→comment_glow.
    // Use COALESCE to handle both pre- and post-migration column names gracefully.
    const user = await queryOne<{
      id: string;
      username: string;
      founder_number: number | null;
      post_glow: number;
      comment_glow: number;
      created_at: string;
    }>(
      `SELECT id, username,
              COALESCE(founder_number, founder_badge_number) as founder_number,
              COALESCE(post_glow, post_sparks) as post_glow,
              COALESCE(comment_glow, comment_sparks) as comment_glow,
              created_at
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
        sparkScore: glow, // backward compat during redesign
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
