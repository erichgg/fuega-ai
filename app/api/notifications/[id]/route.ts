import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { checkGeneralRateLimit } from "@/lib/auth/rate-limit";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { queryOne } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/notifications/:id
 * Soft-delete a notification. Auth required (own notifications only).
 */
export async function DELETE(req: Request, context: RouteContext) {
  try {
    if (!isFeatureEnabled("ENABLE_NOTIFICATIONS")) {
      return NextResponse.json(
        { error: "Notifications are not enabled", code: "FEATURE_DISABLED" },
        { status: 403 }
      );
    }

    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const rateLimit = await checkGeneralRateLimit(user.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const { id } = await context.params;

    const result = await queryOne<{ id: string }>(
      `UPDATE notifications
       SET deleted_at = NOW()
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, user.userId]
    );

    if (!result) {
      return NextResponse.json(
        { error: "Notification not found", code: "NOTIFICATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Delete notification error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
