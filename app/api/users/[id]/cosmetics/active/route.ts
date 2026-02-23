import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  setActiveCosmetics,
  getActiveCosmetics,
  type ActiveCosmetics,
} from "@/lib/services/cosmetics.service";
import { ServiceError } from "@/lib/services/posts.service";

const VALID_SLOTS = new Set(["theme", "border", "title", "color", "avatar", "banner", "icon"]);

/**
 * GET /api/users/:id/cosmetics/active
 * Get a user's currently active cosmetics.
 * Public.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const active = await getActiveCosmetics(userId);
    return NextResponse.json({ active });
  } catch (err) {
    console.error("Get active cosmetics error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/:id/cosmetics/active
 * Set active cosmetics for the authenticated user.
 * Auth required (own user only).
 * Body: { theme?: string, border?: string, title?: string, color?: string, avatar?: string, banner?: string, icon?: string }
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isFeatureEnabled("ENABLE_COSMETICS_SHOP")) {
      return NextResponse.json(
        { error: "Cosmetics shop is not available", code: "FEATURE_DISABLED" },
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

    const { id: userId } = await params;

    // Only own user can set active cosmetics
    if (user.userId !== userId) {
      return NextResponse.json(
        { error: "You can only update your own cosmetics", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Validate body has only valid slots
    const cosmetics: ActiveCosmetics = {};
    for (const [key, value] of Object.entries(body)) {
      if (!VALID_SLOTS.has(key)) {
        return NextResponse.json(
          { error: `Invalid cosmetic slot: ${key}`, code: "INVALID_SLOT" },
          { status: 400 }
        );
      }
      if (value !== null && typeof value !== "string") {
        return NextResponse.json(
          { error: `Slot "${key}" must be a string or null`, code: "INVALID_INPUT" },
          { status: 400 }
        );
      }
      if (value) {
        (cosmetics as Record<string, string>)[key] = value as string;
      }
    }

    await setActiveCosmetics(userId, cosmetics);

    return NextResponse.json({
      message: "Active cosmetics updated",
      active: cosmetics,
    });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Set active cosmetics error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
