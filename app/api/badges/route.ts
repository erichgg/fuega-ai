import { NextResponse } from "next/server";
import { checkReadRateLimit } from "@/lib/auth/rate-limit";
import { hashIp, getClientIp } from "@/lib/auth/ip-hash";
import { listAllBadges } from "@/lib/services/badges.service";

export const dynamic = 'force-dynamic';

/**
 * GET /api/badges
 * List all 40 badge definitions. Public, no auth required.
 * Cached response (badges rarely change).
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

    const badges = await listAllBadges();

    return NextResponse.json(
      { badges, count: badges.length },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      }
    );
  } catch (err) {
    console.error("List badges error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
