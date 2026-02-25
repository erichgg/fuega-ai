import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { checkGeneralRateLimit } from "@/lib/auth/rate-limit";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { markAllAsRead } from "@/lib/services/notifications.service";

export const dynamic = "force-dynamic";

/**
 * PUT /api/notifications/read-all
 * Mark all unread notifications as read. Auth required.
 */
export async function PUT(req: Request) {
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

    const count = await markAllAsRead(user.userId);

    return NextResponse.json({ marked_read: count });
  } catch (err) {
    console.error("Mark all notifications read error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
