import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { voteSchema } from "@/lib/validation/votes";
import { voteOnComment, removeVoteOnComment } from "@/lib/services/votes.service";
import { ServiceError } from "@/lib/services/posts.service";
import { checkVoteRateLimit } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/comments/:id/vote
 * Vote on a comment. value: 1 (spark) or -1 (douse).
 * Toggle off by voting the same value again.
 */
export async function POST(req: Request, context: RouteContext) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const rateLimit = await checkVoteRateLimit(user.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many votes. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const { id: commentId } = await context.params;
    const body = await req.json();
    const parsed = voteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: (parsed.error.errors[0]?.message ?? "Invalid input"), code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const result = await voteOnComment(commentId, user.userId, parsed.data.value as 1 | -1);

    return NextResponse.json({
      vote: result.vote,
      sparks: result.sparks,
      douses: result.douses,
      action: result.action,
    });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Vote on comment error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/comments/:id/vote
 * Remove the current user's vote on a comment. Auth required.
 */
export async function DELETE(req: Request, context: RouteContext) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const rateLimit = await checkVoteRateLimit(user.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many votes. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const { id: commentId } = await context.params;
    const result = await removeVoteOnComment(commentId, user.userId);

    return NextResponse.json({
      vote: result.vote,
      sparks: result.sparks,
      douses: result.douses,
      action: result.action,
    });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Remove comment vote error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
