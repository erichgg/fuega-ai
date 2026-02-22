import { NextResponse } from "next/server";
import { getUserBadges } from "@/lib/services/badges.service";
import { ServiceError } from "@/lib/services/posts.service";

/**
 * GET /api/users/:id/badges
 * Get all badges earned by a user, sorted by rarity (legendary first).
 * Public (badges are visible on profiles).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
