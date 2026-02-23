import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { query, queryOne, queryAll } from "@/lib/db";
import {
  DEFAULT_AI_CONFIG,
  validateAndMergeConfig,
  type CampfireAIConfig,
} from "@/lib/ai/structured-config";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface CampfireRow {
  id: string;
  name: string;
  ai_config: CampfireAIConfig | null;
}

interface MemberRow {
  user_id: string;
  role: string;
  joined_at: string;
}

interface ProposalRow {
  id: string;
  campfire_id: string;
  proposed_by: string;
  changes: Record<string, unknown>;
  rationale: string;
  status: string;
  votes_for: number;
  votes_against: number;
  votes_abstain: number;
  voting_ends_at: string;
  created_at: string;
}

/**
 * GET /api/campfires/:id/config-proposals
 * List config change proposals for a campfire.
 * Public — transparency in governance.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify campfire exists
    const campfire = await queryOne<{ id: string }>(
      `SELECT id FROM campfires WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (!campfire) {
      return NextResponse.json(
        { error: "Campfire not found", code: "CAMPFIRE_NOT_FOUND" },
        { status: 404 }
      );
    }

    const proposals = await queryAll<ProposalRow>(
      `SELECT id, campfire_id, proposed_by, changes, rationale, status,
              votes_for, votes_against, votes_abstain, voting_ends_at, created_at
       FROM config_proposals
       WHERE campfire_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [id]
    );

    return NextResponse.json({ proposals });
  } catch (err) {
    console.error("List config proposals error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/campfires/:id/config-proposals
 * Create a new config change proposal.
 * Auth required, must be a member for 7+ days.
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

    // Check campfire exists and get current config
    const campfire = await queryOne<CampfireRow>(
      `SELECT id, name, ai_config
       FROM campfires
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (!campfire) {
      return NextResponse.json(
        { error: "Campfire not found", code: "CAMPFIRE_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Check membership and tenure
    const membership = await queryOne<MemberRow>(
      `SELECT user_id, role, joined_at
       FROM campfire_members
       WHERE campfire_id = $1 AND user_id = $2`,
      [id, user.userId]
    );

    if (!membership) {
      return NextResponse.json(
        { error: "You must be a member of this campfire", code: "NOT_MEMBER" },
        { status: 403 }
      );
    }

    // Lurkers cannot create proposals
    if (membership.role === "lurker") {
      return NextResponse.json(
        { error: "Lurkers cannot create proposals", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Check 7-day membership requirement
    const joinedAt = new Date(membership.joined_at);
    const now = new Date();
    const daysSinceJoin = (now.getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceJoin < 7) {
      return NextResponse.json(
        {
          error: "You must be a member for at least 7 days to propose config changes",
          code: "INSUFFICIENT_TENURE",
        },
        { status: 403 }
      );
    }

    // Parse and validate body
    const body = await req.json();
    const { changes, rationale } = body;

    if (!changes || typeof changes !== "object" || Object.keys(changes).length === 0) {
      return NextResponse.json(
        { error: "At least one config change is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (!rationale || typeof rationale !== "string" || rationale.length < 10) {
      return NextResponse.json(
        { error: "Rationale must be at least 10 characters", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (rationale.length > 2000) {
      return NextResponse.json(
        { error: "Rationale must be at most 2000 characters", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Validate changes against guardrails
    const currentConfig = campfire.ai_config ?? DEFAULT_AI_CONFIG;
    const validation = validateAndMergeConfig(currentConfig, changes);

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.errors?.[0] ?? "Invalid config values",
          code: "GUARDRAIL_VIOLATION",
        },
        { status: 400 }
      );
    }

    // Check no active proposal exists for overlapping settings
    const changedKeys = Object.keys(changes);
    const activeProposal = await queryOne<{ id: string }>(
      `SELECT id FROM config_proposals
       WHERE campfire_id = $1
         AND status IN ('discussion', 'voting')
         AND changes ?| $2`,
      [id, changedKeys]
    );

    if (activeProposal) {
      return NextResponse.json(
        {
          error: "An active proposal already exists for one or more of these settings",
          code: "DUPLICATE_PROPOSAL",
        },
        { status: 409 }
      );
    }

    // Get governance config for voting duration
    const votingDays = currentConfig.config_change_voting_days;
    const votingEndsAt = new Date(now.getTime() + votingDays * 24 * 60 * 60 * 1000);

    // Create the proposal
    const proposal = await queryOne<ProposalRow>(
      `INSERT INTO config_proposals
       (campfire_id, proposed_by, changes, rationale, status, voting_ends_at)
       VALUES ($1, $2, $3, $4, 'voting', $5)
       RETURNING *`,
      [id, user.userId, JSON.stringify(changes), rationale, votingEndsAt.toISOString()]
    );

    return NextResponse.json({ proposal }, { status: 201 });
  } catch (err) {
    console.error("Create config proposal error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
