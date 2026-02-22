import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { markAsRead } from "@/lib/services/notifications.service";

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read. Auth required (own notifications only).
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const notification = await markAsRead(id, user.userId);

    return NextResponse.json({ notification });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      const serviceErr = err as Error & { code: string; status: number };
      return NextResponse.json(
        { error: serviceErr.message, code: serviceErr.code },
        { status: serviceErr.status }
      );
    }
    console.error("Mark notification read error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
