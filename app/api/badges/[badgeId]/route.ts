import { NextResponse } from "next/server";
import { getBadgeById } from "@/lib/services/badges.service";

/**
 * GET /api/badges/:badgeId
 * Get single badge definition + percentage of users who have it.
 * Public, no auth required.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ badgeId: string }> }
) {
  try {
    const { badgeId } = await params;

    const badge = await getBadgeById(badgeId);
    if (!badge) {
      return NextResponse.json(
        { error: "Badge not found", code: "BADGE_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { badge },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      }
    );
  } catch (err) {
    console.error("Get badge error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
