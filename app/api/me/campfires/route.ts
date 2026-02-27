import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { checkReadRateLimit } from "@/lib/auth/rate-limit";
import { hashIp, getClientIp } from "@/lib/auth/ip-hash";
import { getUserCampfires } from "@/lib/services/campfires.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/me/campfires
 * Returns the authenticated user's joined campfires.
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

    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const campfires = await getUserCampfires(user.userId);
    return NextResponse.json({ campfires });
  } catch (err: unknown) {
    console.error("GET /api/me/campfires error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
