import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import {
  createProposalSchema,
  listProposalsSchema,
} from "@/lib/validation/proposals";
import {
  createProposal,
  listProposals,
  GovernanceError,
} from "@/lib/services/governance.service";

/**
 * GET /api/proposals?community_id=&status=&limit=&offset=
 * List proposals for a community.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const communityId = url.searchParams.get("community_id");

    if (!communityId) {
      return NextResponse.json(
        { error: "community_id is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const parsed = listProposalsSchema.safeParse({
      community_id: communityId,
      status: url.searchParams.get("status") ?? undefined,
      limit: url.searchParams.get("limit") ?? "25",
      offset: url.searchParams.get("offset") ?? "0",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: (parsed.error.errors[0]?.message ?? "Invalid input"), code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const proposals = await listProposals(parsed.data);

    return NextResponse.json({
      proposals,
      count: proposals.length,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });
  } catch (err) {
    console.error("List proposals error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/proposals
 * Create a new governance proposal. Auth required.
 * Must be a member for 7+ days.
 */
export async function POST(req: Request) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = createProposalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: (parsed.error.errors[0]?.message ?? "Invalid input"),
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const proposal = await createProposal(parsed.data, user.userId);

    return NextResponse.json({ proposal }, { status: 201 });
  } catch (err) {
    if (err instanceof GovernanceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    console.error("Create proposal error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
