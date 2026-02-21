import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { createCommentSchema } from "@/lib/validation/comments";
import { createComment } from "@/lib/services/comments.service";
import { ServiceError } from "@/lib/services/posts.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/posts/:id/comments
 * Create a comment on a post. Auth required.
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
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: (parsed.error.errors[0]?.message ?? "Invalid input"), code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const result = await createComment(postId, parsed.data, user.userId);

    return NextResponse.json(
      {
        comment: result,
        moderation: result.moderation,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Create comment error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
