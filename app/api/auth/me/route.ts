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

    const user = await queryOne<{
      id: string;
      username: string;
      founder_badge_number: number | null;
      post_sparks: number;
      comment_sparks: number;
      created_at: string;
    }>(
      `SELECT id, username, founder_badge_number, post_sparks, comment_sparks, created_at
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

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        founderBadgeNumber: user.founder_badge_number,
        sparkScore: user.post_sparks + user.comment_sparks,
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
