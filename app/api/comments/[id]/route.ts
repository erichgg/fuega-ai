import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { updateCommentSchema } from "@/lib/validation/comments";
import { updateComment, deleteComment } from "@/lib/services/comments.service";
import { ServiceError } from "@/lib/services/posts.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/comments/:id
 * Update a comment. Owner only. Re-runs moderation.
 */
export async function PATCH(req: Request, context: RouteContext) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: (parsed.error.errors[0]?.message ?? "Invalid input"), code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const updated = await updateComment(id, user.userId, parsed.data);

    return NextResponse.json({ comment: updated });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Update comment error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/comments/:id
 * Soft delete a comment. Owner or admin. Preserves thread structure.
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

    const { id } = await context.params;
    await deleteComment(id, user.userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Delete comment error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
