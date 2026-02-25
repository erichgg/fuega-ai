import { NextResponse } from "next/server";
import { checkReadRateLimit } from "@/lib/auth/rate-limit";
import { hashIp, getClientIp } from "@/lib/auth/ip-hash";
import { getUserBadges } from "@/lib/services/badges.service";
import { ServiceError } from "@/lib/services/posts.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/:id/badges
 * Get all badges earned by a user, sorted by rarity (legendary first).
 * Public (badges are visible on profiles).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const badges = await getUserBadges(id);

    return NextResponse.json({
      badges,
      count: badges.length,
    });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Get user badges error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
