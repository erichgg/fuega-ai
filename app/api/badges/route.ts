import { NextResponse } from "next/server";
import { listAllBadges } from "@/lib/services/badges.service";

/**
 * GET /api/badges
 * List all 40 badge definitions. Public, no auth required.
 * Cached response (badges rarely change).
 */
export async function GET() {
  try {
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
