import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { setPrimaryBadgeSchema } from "@/lib/validation/badges";
import { setPrimaryBadge } from "@/lib/services/badges.service";
import { ServiceError } from "@/lib/services/posts.service";

/**
 * PUT /api/users/:id/primary-badge
 * Set a user's primary display badge. Auth required (own user only).
 * Body: { badge_id: "v1_founder" }
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Can only set your own primary badge
    if (user.userId !== id) {
      return NextResponse.json(
        { error: "Cannot set another user's primary badge", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = setPrimaryBadgeSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Invalid input";
      return NextResponse.json(
        { error: firstError, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    await setPrimaryBadge(user.userId, parsed.data.badge_id);

    return NextResponse.json({
      success: true,
      primary_badge: parsed.data.badge_id,
    });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Set primary badge error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
