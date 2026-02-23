import { NextResponse } from "next/server";
import { getAllFeatureFlags } from "@/lib/feature-flags";

/**
 * GET /api/features
 * Public endpoint — returns current feature flag states.
 * Client uses this to show/hide UI for unreleased features.
 */
export async function GET() {
  const flags = getAllFeatureFlags();

  return NextResponse.json({
    badges: flags.ENABLE_BADGE_DISTRIBUTION,
    tip_jar: flags.ENABLE_TIP_JAR,
    notifications: flags.ENABLE_NOTIFICATIONS,
  });
}
