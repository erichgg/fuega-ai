import { NextResponse } from "next/server";
import { checkReadRateLimit } from "@/lib/auth/rate-limit";
import { hashIp, getClientIp } from "@/lib/auth/ip-hash";
import { listGovernanceVariables } from "@/lib/services/governance-variables.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/governance-variables
 * List all governance variables (public, read-only).
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

    const variables = await listGovernanceVariables();
    return NextResponse.json({ variables });
  } catch (err) {
    console.error("List governance variables error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
