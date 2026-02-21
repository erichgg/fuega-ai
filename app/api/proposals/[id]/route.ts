import { NextResponse } from "next/server";
import {
  getProposalById,
  checkAndExecuteProposal,
  GovernanceError,
} from "@/lib/services/governance.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/proposals/:id
 * Get full proposal details with current vote counts.
 * Also triggers lifecycle check (discussion → voting → pass/fail).
 */
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check and potentially execute the proposal lifecycle
    await checkAndExecuteProposal(id).catch(() => {
      // Lifecycle check is best-effort; don't fail the GET
    });

    const proposal = await getProposalById(id);
    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found", code: "PROPOSAL_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ proposal });
  } catch (err) {
    if (err instanceof GovernanceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Get proposal error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
