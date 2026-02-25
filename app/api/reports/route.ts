import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { checkReportRateLimit } from "@/lib/auth/rate-limit";
import { createReportSchema, listReportsSchema } from "@/lib/validation/reports";
import { createReport, getReportsByUser, ReportError } from "@/lib/services/reports.service";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/reports
 * Create a report. Auth required.
 * Body: { post_id?: string, comment_id?: string, reason: string, details?: string }
 */
export async function POST(req: Request) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const rateLimit = await checkReportRateLimit(user.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many reports. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const body = await req.json();
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { post_id, comment_id, reason, details } = parsed.data;

    // Look up campfire_id from the target post or comment
    let campfireId: string | null = null;

    if (post_id) {
      const post = await queryOne<{ campfire_id: string; author_id: string }>(
        `SELECT campfire_id, author_id FROM posts WHERE id = $1 AND deleted_at IS NULL`,
        [post_id],
      );
      if (!post) {
        return NextResponse.json(
          { error: "Post not found", code: "POST_NOT_FOUND" },
          { status: 404 },
        );
      }
      if (post.author_id === user.userId) {
        return NextResponse.json(
          { error: "Cannot report your own content", code: "SELF_REPORT" },
          { status: 400 },
        );
      }
      campfireId = post.campfire_id;
    } else if (comment_id) {
      const comment = await queryOne<{ campfire_id: string; author_id: string }>(
        `SELECT p.campfire_id, c.author_id
         FROM comments c
         JOIN posts p ON p.id = c.post_id
         WHERE c.id = $1 AND c.deleted_at IS NULL`,
        [comment_id],
      );
      if (!comment) {
        return NextResponse.json(
          { error: "Comment not found", code: "COMMENT_NOT_FOUND" },
          { status: 404 },
        );
      }
      if (comment.author_id === user.userId) {
        return NextResponse.json(
          { error: "Cannot report your own content", code: "SELF_REPORT" },
          { status: 400 },
        );
      }
      campfireId = comment.campfire_id;
    }

    if (!campfireId) {
      return NextResponse.json(
        { error: "Could not determine campfire for this content", code: "INVALID_TARGET" },
        { status: 400 },
      );
    }

    const report = await createReport({
      reporterId: user.userId,
      postId: post_id,
      commentId: comment_id,
      campfireId,
      reason,
      details,
    });

    return NextResponse.json(
      {
        report: {
          id: report.id,
          status: report.status,
          created_at: report.created_at,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof ReportError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("Create report error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/reports
 * List the authenticated user's own reports.
 */
export async function GET(req: Request) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const url = new URL(req.url);
    const params = listReportsSchema.safeParse({
      limit: url.searchParams.get("limit"),
      offset: url.searchParams.get("offset"),
    });

    if (!params.success) {
      return NextResponse.json(
        { error: params.error.errors[0]?.message ?? "Invalid parameters", code: "VALIDATION_ERROR" },
        { status: 400 },
      );
    }

    const { reports, total } = await getReportsByUser(
      user.userId,
      params.data.limit,
      params.data.offset,
    );

    return NextResponse.json({ reports, total });
  } catch (err) {
    console.error("List reports error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
