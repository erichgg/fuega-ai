import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "@/lib/auth/jwt";
import { checkGeneralRateLimit } from "@/lib/auth/rate-limit";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  getPreferences,
  updatePreferences,
} from "@/lib/services/notifications.service";

export const dynamic = "force-dynamic";

const notificationPreferencesSchema = z.object({
  reply_post: z.boolean().optional(),
  reply_comment: z.boolean().optional(),
  spark: z.boolean().optional(),
  mention: z.boolean().optional(),
  campfire_update: z.boolean().optional(),
  governance: z.boolean().optional(),
  badge_earned: z.boolean().optional(),
  tip_received: z.boolean().optional(),
  referral: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
  push_reply_post: z.boolean().optional(),
  push_reply_comment: z.boolean().optional(),
  push_spark: z.boolean().optional(),
  push_mention: z.boolean().optional(),
  push_governance: z.boolean().optional(),
  push_badge_earned: z.boolean().optional(),
  push_referral: z.boolean().optional(),
}).strict();

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
      const serviceErr = err as Error & { code: string; status: number };
      return NextResponse.json(
        { error: serviceErr.message, code: serviceErr.code },
        { status: serviceErr.status }
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

    const rateLimit = await checkGeneralRateLimit(user.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    const parsed = notificationPreferencesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.errors[0]?.message ?? "Invalid input",
          code: "INVALID_INPUT",
        },
        { status: 400 }
      );
    }

    const preferences = await updatePreferences(user.userId, parsed.data);
    return NextResponse.json({ preferences });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      const serviceErr = err as Error & { code: string; status: number };
      return NextResponse.json(
        { error: serviceErr.message, code: serviceErr.code },
        { status: serviceErr.status }
      );
    }
    console.error("Update notification preferences error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
