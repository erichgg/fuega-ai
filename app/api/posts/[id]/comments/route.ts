import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { createCommentSchema } from "@/lib/validation/comments";
import { createComment, getCommentsForPost } from "@/lib/services/comments.service";
import { ServiceError } from "@/lib/services/posts.service";
import { checkCommentRateLimit, checkReadRateLimit } from "@/lib/auth/rate-limit";
import { hashIp, getClientIp } from "@/lib/auth/ip-hash";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/posts/:id/comments?sort=top|new|controversial
 * List comments for a post (threaded). No auth required.
 */
export async function GET(req: Request, context: RouteContext) {
  try {
    // Rate limit: 60 per minute per IP
    const ip = getClientIp(req);
    const ipHash = hashIp(ip);
    const rateLimit = await checkReadRateLimit(ipHash);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const { id: postId } = await context.params;
    const url = new URL(req.url);
    const sort = url.searchParams.get("sort") as "top" | "new" | "controversial" | null;

    const validSorts = ["top", "new", "controversial"];
    const sortBy = sort && validSorts.includes(sort) ? sort : "top";

    const comments = await getCommentsForPost(postId, sortBy);
    return NextResponse.json({ comments });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("List comments error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
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

    const rateLimit = await checkCommentRateLimit(user.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many comments. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
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
