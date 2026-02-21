import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { voteSchema } from "@/lib/validation/votes";
import { voteOnPost } from "@/lib/services/votes.service";
import { ServiceError } from "@/lib/services/posts.service";

interface RouteContext {
  params: Promise<{ id: string }>;
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
