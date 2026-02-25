import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "@/lib/auth/jwt";
import { checkGeneralRateLimit } from "@/lib/auth/rate-limit";
import {
  getResolvedSettings,
  updateSetting,
  getSettingsHistory,
} from "@/lib/services/governance-variables.service";
import { isAdmin } from "@/lib/services/campfires.service";
import { ServiceError } from "@/lib/services/posts.service";

const updateSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string(),
  reason: z.string().max(500).optional(),
});

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/campfires/:id/settings
 * Get all resolved settings for a campfire (defaults + overrides).
 */
export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id: campfireId } = await context.params;
    const settings = await getResolvedSettings(campfireId);
    return NextResponse.json({ settings });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("Get campfire settings error:", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * PUT /api/campfires/:id/settings
 * Update a governance variable for a campfire. Admin only.
 * Body: { key: string, value: string, reason?: string }
 */
export async function PUT(req: Request, context: RouteContext) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const rateLimit = await checkGeneralRateLimit(user.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const { id: campfireId } = await context.params;

    // Check admin
    const admin = await isAdmin(user.userId, campfireId);
    if (!admin) {
      return NextResponse.json({ error: "Only campfire admins can change settings", code: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSettingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { key, value, reason } = parsed.data;

    const setting = await updateSetting(campfireId, key, String(value), user.userId, "manual", undefined, reason);

    return NextResponse.json({ setting });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("Update campfire setting error:", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
