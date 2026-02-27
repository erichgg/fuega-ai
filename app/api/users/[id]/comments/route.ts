import { NextResponse } from "next/server";
import { checkReadRateLimit } from "@/lib/auth/rate-limit";
import { hashIp, getClientIp } from "@/lib/auth/ip-hash";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CommentRow {
  id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  sparks: number;
  douses: number;
  post_id: string;
  post_title: string;
  campfire_id: string;
  campfire_name: string;
}

/**
 * GET /api/users/:id/comments
 * Public endpoint — returns comments by a user with post/campfire context.
 * Accepts UUID or username as :id.
 * Query params:
 *   - limit: number (default 20, max 50)
 *   - before: ISO date cursor for pagination
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ipHash = hashIp(getClientIp(req));
    const rateLimit = await checkReadRateLimit(ipHash);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const { id } = await params;
    const url = new URL(req.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") ?? "20", 10), 1),
      50
    );
    const before = url.searchParams.get("before") ?? undefined;

    // Resolve user ID
    const isUuid = UUID_RE.test(id);
    const userRow = await queryOne<{ id: string; profile_visible: boolean }>(
      `SELECT id, profile_visible FROM users
       WHERE ${isUuid ? "id = $1" : "LOWER(username) = LOWER($1)"}
         AND deleted_at IS NULL AND is_banned = false`,
      [id]
    );

    if (!userRow) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!userRow.profile_visible) {
      return NextResponse.json(
        { error: "This user's profile is private", code: "PROFILE_PRIVATE" },
        { status: 403 }
      );
    }

    // Build query with optional cursor
    const cursorClause = before ? "AND c.created_at < $3" : "";
    const queryParams: unknown[] = [userRow.id, limit];
    if (before) queryParams.push(before);

    const result = await query<CommentRow>(
      `SELECT c.id, c.body, c.created_at, c.edited_at, c.sparks, c.douses,
              p.id AS post_id, p.title AS post_title,
              cf.id AS campfire_id, cf.name AS campfire_name
       FROM comments c
       JOIN posts p ON p.id = c.post_id
       JOIN campfires cf ON cf.id = p.campfire_id
       WHERE c.author_id = $1
         AND c.deleted_at IS NULL
         AND c.is_removed = false
         AND p.deleted_at IS NULL
         AND cf.deleted_at IS NULL
         ${cursorClause}
       ORDER BY c.created_at DESC
       LIMIT $2`,
      queryParams
    );

    const comments = result.rows.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      editedAt: row.edited_at,
      sparks: row.sparks,
      douses: row.douses,
      post: {
        id: row.post_id,
        title: row.post_title,
      },
      campfire: {
        id: row.campfire_id,
        name: row.campfire_name,
      },
    }));

    return NextResponse.json({ comments });
  } catch (err) {
    console.error("Get user comments error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
