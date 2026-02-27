import { NextResponse } from "next/server";
import { checkReadRateLimit } from "@/lib/auth/rate-limit";
import { hashIp, getClientIp } from "@/lib/auth/ip-hash";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/campfires/check-name?name=slug
 * Check if a campfire name/slug is available.
 * Returns { available: boolean }.
 */
export async function GET(req: Request) {
  try {
    const ipHash = hashIp(getClientIp(req));
    const rateLimit = await checkReadRateLimit(ipHash);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const url = new URL(req.url);
    const name = url.searchParams.get("name")?.trim().toLowerCase();

    if (!name || name.length < 3 || name.length > 21) {
      return NextResponse.json(
        { error: "Name must be 3-21 characters", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9_]+$/.test(name)) {
      return NextResponse.json(
        { error: "Name must contain only lowercase letters, numbers, and underscores", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const result = await query(
      `SELECT id FROM campfires WHERE name = $1 AND deleted_at IS NULL LIMIT 1`,
      [name]
    );

    return NextResponse.json({ available: result.rows.length === 0 });
  } catch (err) {
    console.error("Check campfire name error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
