import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "@/lib/auth/jwt";
import { checkVoteRateLimit } from "@/lib/auth/rate-limit";
import { query, queryOne } from "@/lib/db";
import {
  DEFAULT_AI_CONFIG,
  validateAndMergeConfig,
  buildPromptFromConfig,
  type CampfireAIConfig,
} from "@/lib/ai/structured-config";

const proposalVoteSchema = z.object({
  vote: z.enum(["for", "against", "abstain"]),
});

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; proposalId: string }>;
}

interface ProposalRow {
  id: string;
  campfire_id: string;
  proposed_by: string;
  changes: Record<string, unknown>;
  status: string;
  votes_for: number;
  votes_against: number;
  votes_abstain: number;
  voting_ends_at: string;
}

interface CampfireRow {
  id: string;
  name: string;
  ai_config: CampfireAIConfig | null;
  member_count: number;
}

type VoteValue = "for" | "against" | "abstain";

/**
 * POST /api/campfires/:id/config-proposals/:proposalId/vote
 * Cast a vote on a config change proposal.
 * Auth required, must be a campfire member (non-lurker).
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

    const rateLimit = await checkVoteRateLimit(user.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const { id, proposalId } = await params;

    // Parse vote
    const body = await req.json();
    const parsed = proposalVoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Vote must be 'for', 'against', or 'abstain'", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    const { vote } = parsed.data;

    // Check membership
    const membership = await queryOne<{ role: string }>(
      `SELECT role FROM campfire_members
       WHERE campfire_id = $1 AND user_id = $2`,
      [id, user.userId]
    );

    if (!membership) {
      return NextResponse.json(
        { error: "You must be a member of this campfire", code: "NOT_MEMBER" },
        { status: 403 }
      );
    }

    if (membership.role === "lurker") {
      return NextResponse.json(
        { error: "Lurkers cannot vote on proposals", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Get proposal
    const proposal = await queryOne<ProposalRow>(
      `SELECT id, campfire_id, proposed_by, changes, status,
              votes_for, votes_against, votes_abstain, voting_ends_at
       FROM config_proposals
       WHERE id = $1 AND campfire_id = $2`,
      [proposalId, id]
    );

    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found", code: "PROPOSAL_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (proposal.status !== "voting") {
      return NextResponse.json(
        { error: "This proposal is not in voting phase", code: "NOT_VOTING" },
        { status: 400 }
      );
    }

    // Check voting deadline
    const votingEnds = new Date(proposal.voting_ends_at);
    if (new Date() > votingEnds) {
      return NextResponse.json(
        { error: "Voting period has ended", code: "VOTING_ENDED" },
        { status: 400 }
      );
    }

    // Check if user already voted (upsert)
    const existingVote = await queryOne<{ id: string; vote: string }>(
      `SELECT id, vote FROM config_proposal_votes
       WHERE proposal_id = $1 AND user_id = $2`,
      [proposalId, user.userId]
    );

    if (existingVote) {
      // Update existing vote
      const oldVote = existingVote.vote as VoteValue;

      await query(
        `UPDATE config_proposal_votes SET vote = $1 WHERE id = $2`,
        [vote, existingVote.id]
      );

      // Adjust vote counts using CASE expressions (no column interpolation)
      if (oldVote !== vote) {
        await query(
          `UPDATE config_proposals
           SET votes_for = votes_for
                 + CASE WHEN $2 = 'for' THEN 1 ELSE 0 END
                 - CASE WHEN $3 = 'for' THEN 1 ELSE 0 END,
               votes_against = votes_against
                 + CASE WHEN $2 = 'against' THEN 1 ELSE 0 END
                 - CASE WHEN $3 = 'against' THEN 1 ELSE 0 END,
               votes_abstain = votes_abstain
                 + CASE WHEN $2 = 'abstain' THEN 1 ELSE 0 END
                 - CASE WHEN $3 = 'abstain' THEN 1 ELSE 0 END
           WHERE id = $1`,
          [proposalId, vote, oldVote]
        );
      }
    } else {
      // Insert new vote
      await query(
        `INSERT INTO config_proposal_votes (proposal_id, user_id, vote)
         VALUES ($1, $2, $3)`,
        [proposalId, user.userId, vote]
      );

      await query(
        `UPDATE config_proposals
         SET votes_for = votes_for + CASE WHEN $2 = 'for' THEN 1 ELSE 0 END,
             votes_against = votes_against + CASE WHEN $2 = 'against' THEN 1 ELSE 0 END,
             votes_abstain = votes_abstain + CASE WHEN $2 = 'abstain' THEN 1 ELSE 0 END
         WHERE id = $1`,
        [proposalId, vote]
      );
    }

    // Fetch updated proposal to check if auto-execute conditions are met
    const updated = await queryOne<ProposalRow>(
      `SELECT * FROM config_proposals WHERE id = $1`,
      [proposalId]
    );

    if (updated) {
      await checkAndExecuteProposal(updated, id);
    }

    return NextResponse.json({
      message: existingVote ? "Vote updated" : "Vote recorded",
      vote,
    });
  } catch (err) {
    console.error("Vote on config proposal error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * Check if a proposal has met quorum + threshold and auto-execute if so.
 */
async function checkAndExecuteProposal(
  proposal: ProposalRow,
  campfireId: string
): Promise<void> {
  const campfire = await queryOne<CampfireRow>(
    `SELECT id, name, ai_config, member_count
     FROM campfires WHERE id = $1`,
    [campfireId]
  );

  if (!campfire) return;

  const currentConfig = campfire.ai_config ?? DEFAULT_AI_CONFIG;
  const quorum = currentConfig.config_change_quorum;
  const threshold = currentConfig.config_change_threshold;

  const totalVotes =
    proposal.votes_for + proposal.votes_against + proposal.votes_abstain;
  const quorumNeeded = Math.ceil((campfire.member_count * quorum) / 100);

  // Quorum not yet met
  if (totalVotes < quorumNeeded) return;

  // Calculate threshold (excluding abstentions)
  const decisiveVotes = proposal.votes_for + proposal.votes_against;
  if (decisiveVotes === 0) return;

  const forPercentage = (proposal.votes_for / decisiveVotes) * 100;

  if (forPercentage >= threshold) {
    // Proposal passes — apply changes
    const validation = validateAndMergeConfig(
      currentConfig,
      proposal.changes
    );

    if (!validation.valid || !validation.config) return;

    const newPrompt = buildPromptFromConfig(campfire.name, validation.config);

    await query(
      `UPDATE campfires
       SET ai_config = $1,
           ai_prompt = $2,
           ai_prompt_version = ai_prompt_version + 1
       WHERE id = $3`,
      [JSON.stringify(validation.config), newPrompt, campfireId]
    );

    await query(
      `UPDATE config_proposals SET status = 'implemented' WHERE id = $1`,
      [proposal.id]
    );

    // Log in prompt history
    await query(
      `INSERT INTO ai_prompt_history
       (entity_type, entity_id, prompt_text, version, created_by)
       VALUES ('campfire', $1, $2,
         (SELECT ai_prompt_version FROM campfires WHERE id = $1),
         $3)`,
      [campfireId, newPrompt, proposal.proposed_by]
    );
  } else if (new Date() > new Date(proposal.voting_ends_at)) {
    // Voting ended and threshold not met
    await query(
      `UPDATE config_proposals SET status = 'failed' WHERE id = $1`,
      [proposal.id]
    );
  }
}
