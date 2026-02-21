import { query, queryOne, queryAll } from "@/lib/db";
import type {
  CreateProposalInput,
  ListProposalsInput,
} from "@/lib/validation/proposals";
import { getMembership } from "@/lib/services/communities.service";

// ─── Types ───────────────────────────────────────────────────

export interface Proposal {
  id: string;
  community_id: string;
  proposal_type: string;
  title: string;
  description: string;
  proposed_changes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string;
  discussion_ends_at: string;
  voting_ends_at: string;
  status: string;
  votes_for: number;
  votes_against: number;
  votes_abstain: number;
  implemented_at: string | null;
  creator_username?: string;
  community_name?: string;
}

export interface ProposalVote {
  id: string;
  proposal_id: string;
  user_id: string;
  vote: string;
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────

const MEMBERSHIP_DAYS_REQUIRED = 7;
const DEFAULT_DISCUSSION_HOURS = 48;
const DEFAULT_VOTING_HOURS = 168; // 7 days
const DEFAULT_QUORUM_PERCENTAGE = 30;

// ─── Create Proposal ─────────────────────────────────────────

export async function createProposal(
  input: CreateProposalInput,
  userId: string
): Promise<Proposal> {
  // Verify community exists
  const community = await queryOne<{
    id: string;
    governance_config: Record<string, unknown>;
    is_banned: boolean;
    deleted_at: string | null;
  }>(
    `SELECT id, governance_config, is_banned, deleted_at
     FROM communities WHERE id = $1`,
    [input.community_id]
  );

  if (!community || community.deleted_at) {
    throw new GovernanceError(
      "Community not found",
      "COMMUNITY_NOT_FOUND",
      404
    );
  }
  if (community.is_banned) {
    throw new GovernanceError("Community is banned", "COMMUNITY_BANNED", 403);
  }

  // Verify membership and tenure
  const membership = await getMembership(userId, input.community_id);
  if (!membership) {
    throw new GovernanceError(
      "Must be a community member to create proposals",
      "NOT_MEMBER",
      403
    );
  }

  const joinedAt = new Date(membership.joined_at);
  const now = new Date();
  const daysSinceJoin =
    (now.getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceJoin < MEMBERSHIP_DAYS_REQUIRED) {
    const daysRemaining = Math.ceil(MEMBERSHIP_DAYS_REQUIRED - daysSinceJoin);
    throw new GovernanceError(
      `Must be a member for at least ${MEMBERSHIP_DAYS_REQUIRED} days to create proposals. ${daysRemaining} day(s) remaining.`,
      "INSUFFICIENT_TENURE",
      403
    );
  }

  // Calculate discussion and voting end times from governance config
  const govConfig = community.governance_config;
  const discussionHours =
    typeof govConfig.proposal_discussion_hours === "number"
      ? govConfig.proposal_discussion_hours
      : DEFAULT_DISCUSSION_HOURS;
  const votingHours =
    typeof govConfig.proposal_voting_hours === "number"
      ? govConfig.proposal_voting_hours
      : DEFAULT_VOTING_HOURS;

  const discussionEndsAt = new Date(
    now.getTime() + discussionHours * 60 * 60 * 1000
  );
  const votingEndsAt = new Date(
    discussionEndsAt.getTime() + votingHours * 60 * 60 * 1000
  );

  const proposal = await queryOne<Proposal>(
    `INSERT INTO proposals
     (community_id, proposal_type, title, description, proposed_changes,
      created_by, discussion_ends_at, voting_ends_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'discussion')
     RETURNING *`,
    [
      input.community_id,
      input.proposal_type,
      input.title,
      input.description,
      JSON.stringify(input.proposed_changes),
      userId,
      discussionEndsAt.toISOString(),
      votingEndsAt.toISOString(),
    ]
  );

  if (!proposal) {
    throw new GovernanceError(
      "Failed to create proposal",
      "INTERNAL_ERROR",
      500
    );
  }

  return proposal;
}

// ─── Read Proposals ──────────────────────────────────────────

export async function getProposalById(
  proposalId: string
): Promise<Proposal | null> {
  return queryOne<Proposal>(
    `SELECT p.*,
            u.username AS creator_username,
            c.name AS community_name
     FROM proposals p
     JOIN users u ON u.id = p.created_by
     JOIN communities c ON c.id = p.community_id
     WHERE p.id = $1`,
    [proposalId]
  );
}

export async function listProposals(
  input: ListProposalsInput
): Promise<Proposal[]> {
  const conditions: string[] = ["p.community_id = $1"];
  const params: unknown[] = [input.community_id];
  let paramIdx = 2;

  if (input.status) {
    conditions.push(`p.status = $${paramIdx}`);
    params.push(input.status);
    paramIdx++;
  }

  const whereClause = conditions.join(" AND ");

  const sql = `
    SELECT p.*,
           u.username AS creator_username,
           c.name AS community_name
    FROM proposals p
    JOIN users u ON u.id = p.created_by
    JOIN communities c ON c.id = p.community_id
    WHERE ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;
  params.push(input.limit, input.offset);

  return queryAll<Proposal>(sql, params);
}

// ─── Vote on Proposal ────────────────────────────────────────

export async function voteOnProposal(
  proposalId: string,
  userId: string,
  value: 1 | -1
): Promise<ProposalVote> {
  // Fetch proposal
  const proposal = await queryOne<Proposal>(
    `SELECT * FROM proposals WHERE id = $1`,
    [proposalId]
  );

  if (!proposal) {
    throw new GovernanceError("Proposal not found", "PROPOSAL_NOT_FOUND", 404);
  }

  // Check proposal is in voting status
  // Auto-transition from discussion to voting if discussion period has ended
  const now = new Date();
  const discussionEndsAt = new Date(proposal.discussion_ends_at);
  const votingEndsAt = new Date(proposal.voting_ends_at);

  if (proposal.status === "discussion") {
    if (now < discussionEndsAt) {
      throw new GovernanceError(
        "Proposal is still in discussion period. Voting has not started yet.",
        "NOT_VOTING",
        400
      );
    }
    // Transition to voting
    await query(
      `UPDATE proposals SET status = 'voting' WHERE id = $1`,
      [proposalId]
    );
  } else if (proposal.status === "voting") {
    if (now > votingEndsAt) {
      throw new GovernanceError(
        "Voting period has ended",
        "VOTING_ENDED",
        400
      );
    }
  } else {
    throw new GovernanceError(
      `Cannot vote on a proposal with status: ${proposal.status}`,
      "INVALID_STATUS",
      400
    );
  }

  // Verify user is a member
  const membership = await getMembership(userId, proposal.community_id);
  if (!membership) {
    throw new GovernanceError(
      "Must be a community member to vote on proposals",
      "NOT_MEMBER",
      403
    );
  }

  // Check if user already voted
  const existingVote = await queryOne<ProposalVote>(
    `SELECT * FROM proposal_votes WHERE proposal_id = $1 AND user_id = $2`,
    [proposalId, userId]
  );
  if (existingVote) {
    throw new GovernanceError(
      "You have already voted on this proposal",
      "ALREADY_VOTED",
      409
    );
  }

  // Cast vote
  const voteStr = value === 1 ? "for" : "against";
  const vote = await queryOne<ProposalVote>(
    `INSERT INTO proposal_votes (proposal_id, user_id, vote)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [proposalId, userId, voteStr]
  );

  if (!vote) {
    throw new GovernanceError("Failed to cast vote", "INTERNAL_ERROR", 500);
  }

  // Update vote counts on the proposal
  if (value === 1) {
    await query(
      `UPDATE proposals SET votes_for = votes_for + 1 WHERE id = $1`,
      [proposalId]
    );
  } else {
    await query(
      `UPDATE proposals SET votes_against = votes_against + 1 WHERE id = $1`,
      [proposalId]
    );
  }

  return vote;
}

// ─── Proposal Lifecycle ──────────────────────────────────────

export async function checkAndExecuteProposal(
  proposalId: string
): Promise<Proposal> {
  const proposal = await queryOne<Proposal>(
    `SELECT * FROM proposals WHERE id = $1`,
    [proposalId]
  );

  if (!proposal) {
    throw new GovernanceError("Proposal not found", "PROPOSAL_NOT_FOUND", 404);
  }

  const now = new Date();
  const votingEndsAt = new Date(proposal.voting_ends_at);

  // Only process if voting period has ended
  if (now <= votingEndsAt) {
    return proposal;
  }

  // Already processed
  if (
    proposal.status === "passed" ||
    proposal.status === "failed" ||
    proposal.status === "implemented"
  ) {
    return proposal;
  }

  // Get community for quorum calculation
  const community = await queryOne<{
    member_count: number;
    governance_config: Record<string, unknown>;
  }>(
    `SELECT member_count, governance_config FROM communities WHERE id = $1`,
    [proposal.community_id]
  );

  if (!community) {
    throw new GovernanceError(
      "Community not found",
      "COMMUNITY_NOT_FOUND",
      404
    );
  }

  const quorumPct =
    typeof community.governance_config.quorum_percentage === "number"
      ? community.governance_config.quorum_percentage
      : DEFAULT_QUORUM_PERCENTAGE;

  const totalVotes =
    proposal.votes_for + proposal.votes_against + proposal.votes_abstain;
  const quorumRequired = Math.ceil(
    (community.member_count * quorumPct) / 100
  );
  const quorumMet = totalVotes >= quorumRequired;
  const majorityFor =
    totalVotes > 0 && proposal.votes_for > proposal.votes_against;

  if (quorumMet && majorityFor) {
    // Proposal passed — execute
    await query(
      `UPDATE proposals SET status = 'passed' WHERE id = $1`,
      [proposalId]
    );

    await executeProposal(proposal);

    const updated = await queryOne<Proposal>(
      `SELECT * FROM proposals WHERE id = $1`,
      [proposalId]
    );
    return updated ?? proposal;
  } else {
    // Proposal failed
    await query(
      `UPDATE proposals SET status = 'failed' WHERE id = $1`,
      [proposalId]
    );

    const updated = await queryOne<Proposal>(
      `SELECT * FROM proposals WHERE id = $1`,
      [proposalId]
    );
    return updated ?? proposal;
  }
}

async function executeProposal(proposal: Proposal): Promise<void> {
  const changes = proposal.proposed_changes;

  switch (proposal.proposal_type) {
    case "modify_prompt": {
      const newPrompt = changes.new_prompt;
      if (typeof newPrompt !== "string") break;

      // Get current version
      const community = await queryOne<{
        ai_prompt_version: number;
      }>(
        `SELECT ai_prompt_version FROM communities WHERE id = $1`,
        [proposal.community_id]
      );
      const newVersion = (community?.ai_prompt_version ?? 0) + 1;

      // Update community prompt
      await query(
        `UPDATE communities SET ai_prompt = $1, ai_prompt_version = $2
         WHERE id = $3`,
        [newPrompt, newVersion, proposal.community_id]
      );

      // Log in prompt history
      await query(
        `INSERT INTO ai_prompt_history
         (entity_type, entity_id, prompt_text, version, created_by, proposal_id)
         VALUES ('community', $1, $2, $3, $4, $5)`,
        [
          proposal.community_id,
          newPrompt,
          newVersion,
          proposal.created_by,
          proposal.id,
        ]
      );
      break;
    }

    case "addendum_prompt": {
      const addendum = changes.addendum;
      if (typeof addendum !== "string") break;

      // Get current prompt
      const community = await queryOne<{
        ai_prompt: string;
        ai_prompt_version: number;
      }>(
        `SELECT ai_prompt, ai_prompt_version FROM communities WHERE id = $1`,
        [proposal.community_id]
      );
      if (!community) break;

      const newPrompt = `${community.ai_prompt}\n\n${addendum}`;
      const newVersion = community.ai_prompt_version + 1;

      await query(
        `UPDATE communities SET ai_prompt = $1, ai_prompt_version = $2
         WHERE id = $3`,
        [newPrompt, newVersion, proposal.community_id]
      );

      await query(
        `INSERT INTO ai_prompt_history
         (entity_type, entity_id, prompt_text, version, created_by, proposal_id)
         VALUES ('community', $1, $2, $3, $4, $5)`,
        [
          proposal.community_id,
          newPrompt,
          newVersion,
          proposal.created_by,
          proposal.id,
        ]
      );
      break;
    }

    case "change_settings": {
      const settings = changes.settings;
      if (typeof settings !== "object" || settings === null) break;

      // Merge new settings into existing governance_config
      const community = await queryOne<{
        governance_config: Record<string, unknown>;
      }>(
        `SELECT governance_config FROM communities WHERE id = $1`,
        [proposal.community_id]
      );
      if (!community) break;

      const merged = { ...community.governance_config, ...settings };

      await query(
        `UPDATE communities SET governance_config = $1 WHERE id = $2`,
        [JSON.stringify(merged), proposal.community_id]
      );
      break;
    }
  }

  // Mark as implemented
  await query(
    `UPDATE proposals SET status = 'implemented', implemented_at = NOW()
     WHERE id = $1`,
    [proposal.id]
  );
}

// ─── Governance Error ────────────────────────────────────────

export class GovernanceError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "GovernanceError";
    this.code = code;
    this.status = status;
  }
}
