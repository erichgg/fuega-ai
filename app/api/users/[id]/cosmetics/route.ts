import { NextResponse } from "next/server";
import { getUserCosmetics, getActiveCosmetics } from "@/lib/services/cosmetics.service";
import { ServiceError } from "@/lib/services/posts.service";

/**
 * GET /api/users/:id/cosmetics
 * Get a user's owned cosmetics.
 * Public — cosmetics are visible on profiles.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    const [cosmetics, active] = await Promise.all([
      getUserCosmetics(userId),
      getActiveCosmetics(userId),
    ]);

    return NextResponse.json({
      cosmetics,
      active,
      total: cosmetics.length,
    });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Get user cosmetics error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
