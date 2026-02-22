import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { listNotifications, type NotificationType } from "@/lib/services/notifications.service";

const VALID_TYPES: NotificationType[] = [
  "reply_post", "reply_comment", "spark", "mention",
  "community_update", "governance", "badge_earned",
  "tip_received", "referral",
];

/**
 * GET /api/notifications?page=1&limit=20&type=
 * List user notifications, newest first. Auth required.
 */
export async function GET(req: Request) {
  try {
    if (!isFeatureEnabled("ENABLE_NOTIFICATIONS")) {
      return NextResponse.json({ notifications: [], unread_count: 0, total: 0, page: 1, limit: 20 });
    }

    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
    const typeParam = url.searchParams.get("type") as NotificationType | null;

    if (typeParam && !VALID_TYPES.includes(typeParam)) {
      return NextResponse.json(
        { error: "Invalid notification type", code: "INVALID_TYPE" },
        { status: 400 }
      );
    }

    const result = await listNotifications(user.userId, {
      page,
      limit,
      type: typeParam ?? undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("List notifications error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
