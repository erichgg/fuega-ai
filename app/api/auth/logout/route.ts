import { NextResponse } from "next/server";
import { clearAuthCookie, authenticate } from "@/lib/auth/jwt";
import { checkGeneralRateLimit } from "@/lib/auth/rate-limit";
import { hashIp, getClientIp } from "@/lib/auth/ip-hash";
import { logger } from "@/lib/monitoring/logger";

export async function POST(req: Request) {
  try {
    // Rate-limit by IP hash to prevent abuse
    const ipHash = hashIp(getClientIp(req));
    const rateLimit = await checkGeneralRateLimit(ipHash);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    await authenticate(req);

    // Clear the cookie regardless of auth state
    await clearAuthCookie();

    // Log without PII — anonymity is paramount
    logger.info("User session cleared");

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Logout error", err instanceof Error ? { message: err.message } : undefined);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
