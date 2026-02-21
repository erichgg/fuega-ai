import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { updatePostSchema } from "@/lib/validation/posts";
import {
  getPostById,
  updatePost,
  deletePost,
  ServiceError,
} from "@/lib/services/posts.service";
import { getCommentsForPost } from "@/lib/services/comments.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/posts/:id
 * Get a single post with threaded comments.
 */
export async function GET(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const url = new URL(req.url);
    const commentSort = (url.searchParams.get("comment_sort") ?? "top") as
      | "top"
      | "new"
      | "controversial";

    const post = await getPostById(id);
    if (!post) {
      return NextResponse.json(
        { error: "Post not found", code: "POST_NOT_FOUND" },
        { status: 404 }
      );
    }

    const comments = await getCommentsForPost(id, commentSort);

    return NextResponse.json({ post, comments });
  } catch (err) {
    console.error("Get post error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/posts/:id
 * Update a post. Owner only. Tracks edit history. Re-runs moderation.
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
    const parsed = updatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: (parsed.error.errors[0]?.message ?? "Invalid input"), code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const updated = await updatePost(id, user.userId, parsed.data);

    return NextResponse.json({ post: updated });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Update post error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/:id
 * Soft delete a post. Owner or admin.
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
    await deletePost(id, user.userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Delete post error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
