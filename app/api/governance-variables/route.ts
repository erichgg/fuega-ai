import { NextResponse } from "next/server";
import { listGovernanceVariables } from "@/lib/services/governance-variables.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/governance-variables
 * List all governance variables (public, read-only).
 */
export async function GET() {
  try {
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
