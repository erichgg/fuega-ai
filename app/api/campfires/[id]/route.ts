import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { checkGeneralRateLimit, checkReadRateLimit } from "@/lib/auth/rate-limit";
import { hashIp, getClientIp } from "@/lib/auth/ip-hash";
import { updateCampfireSchema } from "@/lib/validation/campfires";
import {
  getCampfireById,
  getCampfireByName,
  getMembership,
  updateCampfire,
  ServiceError,
} from "@/lib/services/campfires.service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// UUID v4 pattern for detecting whether the param is a UUID or a slug name
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/campfires/:id
 * Get full campfire details. Supports both UUID and slug name.
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const ipHash = hashIp(getClientIp(req));
    const rateLimit = await checkReadRateLimit(ipHash);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const { id } = await params;

    // Support both UUID lookup and name-based lookup
    const campfire = UUID_RE.test(id)
      ? await getCampfireById(id)
      : await getCampfireByName(id);

    if (!campfire) {
      return NextResponse.json(
        { error: "Campfire not found", code: "CAMPFIRE_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Check if authenticated user is a member
    let is_member = false;
    const user = await authenticate(req);
    if (user) {
      const membership = await getMembership(user.userId, campfire.id);
      is_member = !!membership;
    }

    return NextResponse.json({ campfire, is_member });
  } catch (err) {
    console.error("Get campfire error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/campfires/:id
 * Update campfire settings. Admin only.
 * Cannot directly update AI prompt (must use proposal).
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
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

    const { id } = await params;

    const body = await req.json();
    const parsed = updateCampfireSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: (parsed.error.errors[0]?.message ?? "Invalid input"),
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const campfire = await updateCampfire(id, user.userId, parsed.data);

    return NextResponse.json({ campfire });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Update campfire error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
