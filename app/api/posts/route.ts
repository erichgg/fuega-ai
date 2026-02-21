import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { createPostSchema, listPostsSchema } from "@/lib/validation/posts";
import { createPost, listPosts, ServiceError } from "@/lib/services/posts.service";

/**
 * GET /api/posts?community=&sort=&limit=&offset=
 * List posts with sorting and pagination.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = listPostsSchema.safeParse({
      community: url.searchParams.get("community") ?? undefined,
      sort: url.searchParams.get("sort") ?? "hot",
      limit: url.searchParams.get("limit") ?? "25",
      offset: url.searchParams.get("offset") ?? "0",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: (parsed.error.errors[0]?.message ?? "Invalid input"), code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const posts = await listPosts(parsed.data);

    return NextResponse.json({
      posts,
      count: posts.length,
      sort: parsed.data.sort,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });
  } catch (err) {
    console.error("List posts error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts
 * Create a new post. Auth required.
 */
export async function POST(req: Request) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Invalid input";
      return NextResponse.json(
        { error: firstError, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const result = await createPost(parsed.data, user.userId);

    return NextResponse.json(
      {
        post: result,
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
    console.error("Create post error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
