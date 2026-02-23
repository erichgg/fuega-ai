import { NextResponse } from "next/server";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getPublicSupporters } from "@/lib/services/tips.service";

/**
 * GET /api/supporters
 * Public endpoint — returns recent tips with usernames and totals.
 * Users who opted out via notification_preferences are excluded.
 */
export async function GET() {
  try {
    if (!isFeatureEnabled("ENABLE_TIP_JAR")) {
      return NextResponse.json(
        { error: "Tip jar is not available", code: "FEATURE_DISABLED" },
        { status: 403 }
      );
    }

    const summary = await getPublicSupporters(50);

    return NextResponse.json(summary);
  } catch (err) {
    console.error("[supporters] Error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
