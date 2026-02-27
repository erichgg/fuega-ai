import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { voteSchema } from "@/lib/validation/votes";
import { voteOnPost, removeVoteOnPost, getUserVote, getUserVotesForPostComments } from "@/lib/services/votes.service";
import { ServiceError } from "@/lib/services/posts.service";
import { checkVoteRateLimit } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/posts/:id/vote
 * Get the current user's vote on this post. Auth required.
 * Returns { vote_value: 1 | -1 | null }
 */
export async function GET(req: Request, context: RouteContext) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { id: postId } = await context.params;
    const url = new URL(req.url);
    const includeComments = url.searchParams.get("include_comments") === "true";

    const existingVote = await getUserVote(user.userId, "post", postId);

    const response: { vote_value: number | null; comment_votes?: Record<string, number> } = {
      vote_value: existingVote ? existingVote.vote_value : null,
    };

    if (includeComments) {
      response.comment_votes = await getUserVotesForPostComments(user.userId, postId);
    }

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Get post vote error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts/:id/vote
 * Vote on a post. value: 1 (spark) or -1 (douse).
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

    const { id: postId } = await context.params;
    const body = await req.json();
    const parsed = voteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: (parsed.error.errors[0]?.message ?? "Invalid input"), code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const result = await voteOnPost(postId, user.userId, parsed.data.value as 1 | -1);

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
    console.error("Vote on post error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/:id/vote
 * Remove the current user's vote on a post. Auth required.
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

    const { id: postId } = await context.params;
    const result = await removeVoteOnPost(postId, user.userId);

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
    console.error("Remove post vote error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
