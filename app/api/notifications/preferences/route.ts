import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  getPreferences,
  updatePreferences,
  type NotificationPreferences,
} from "@/lib/services/notifications.service";

/**
 * GET /api/notifications/preferences
 * Returns notification preferences for the authenticated user.
 */
export async function GET(req: Request) {
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

    const preferences = await getPreferences(user.userId);
    return NextResponse.json({ preferences });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      const serviceErr = err as Error & { code: string; statusCode: number };
      return NextResponse.json(
        { error: serviceErr.message, code: serviceErr.code },
        { status: serviceErr.statusCode }
      );
    }
    console.error("Get notification preferences error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/preferences
 * Update notification preferences. Auth required.
 * Body: partial NotificationPreferences (e.g., { reply_post: true, push_spark: false })
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

    const body = await req.json() as Partial<NotificationPreferences>;

    // Validate: all values must be booleans
    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== "boolean") {
        return NextResponse.json(
          { error: `Invalid value for '${key}': must be boolean`, code: "INVALID_INPUT" },
          { status: 400 }
        );
      }
    }

    const preferences = await updatePreferences(user.userId, body);
    return NextResponse.json({ preferences });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      const serviceErr = err as Error & { code: string; statusCode: number };
      return NextResponse.json(
        { error: serviceErr.message, code: serviceErr.code },
        { status: serviceErr.statusCode }
      );
    }
    console.error("Update notification preferences error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
