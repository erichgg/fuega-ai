import { NextResponse } from "next/server";
import { getSettingsHistory } from "@/lib/services/governance-variables.service";
import { ServiceError } from "@/lib/services/posts.service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/campfires/:id/settings/history
 * Get the audit trail of settings changes for a campfire.
 * Public endpoint — governance transparency.
 */
export async function GET(req: Request, context: RouteContext) {
  try {
    const { id: campfireId } = await context.params;

    const url = new URL(req.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1),
      100,
    );

    const history = await getSettingsHistory(campfireId, limit);
    return NextResponse.json({ history });
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("Get settings history error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
