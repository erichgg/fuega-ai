import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { voteProposalSchema } from "@/lib/validation/proposals";
import {
  voteOnProposal,
  GovernanceError,
} from "@/lib/services/governance.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/proposals/:id/vote
 * Vote on a proposal. Auth required. Must be a community member.
 * value: 1 (for) or -1 (against)
 * Cannot change vote once cast.
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const body = await req.json();
    const parsed = voteProposalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: (parsed.error.errors[0]?.message ?? "Invalid input"),
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const vote = await voteOnProposal(id, user.userId, parsed.data.value);

    return NextResponse.json({ vote }, { status: 201 });
  } catch (err) {
    if (err instanceof GovernanceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Vote on proposal error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
