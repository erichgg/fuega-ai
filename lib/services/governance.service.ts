import { query, queryOne, queryAll } from "@/lib/db";
import type {
  CreateProposalInput,
  ListProposalsInput,
} from "@/lib/validation/proposals";
import { getMembership } from "@/lib/services/campfires.service";
import { createNotification } from "@/lib/services/notifications.service";
import { updateSetting } from "@/lib/services/governance-variables.service";

// ─── Types ───────────────────────────────────────────────────

export interface Proposal {
  id: string;
  campfire_id: string;
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
  campfire_name?: string;
  member_count?: number;
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
  // Verify campfire exists
  const campfire = await queryOne<{
    id: string;
    name: string;
    governance_config: Record<string, unknown>;
    is_banned: boolean;
    deleted_at: string | null;
  }>(
    `SELECT id, name, governance_config, is_banned, deleted_at
     FROM campfires WHERE id = $1`,
    [input.campfire_id]
  );

  if (!campfire || campfire.deleted_at) {
    throw new GovernanceError(
      "Campfire not found",
      "CAMPFIRE_NOT_FOUND",
      404
    );
  }
  if (campfire.is_banned) {
    throw new GovernanceError("Campfire is banned", "CAMPFIRE_BANNED", 403);
  }

  // Verify membership and tenure
  const membership = await getMembership(userId, input.campfire_id);
  if (!membership) {
    throw new GovernanceError(
      "Must be a campfire member to create proposals",
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
  const govConfig = campfire.governance_config;
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
     (campfire_id, proposal_type, title, description, proposed_changes,
      created_by, discussion_ends_at, voting_ends_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'discussion')
     RETURNING *`,
    [
      input.campfire_id,
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

  // Notify campfire members about new governance proposal (non-blocking)
  notifyCampfireMembers(
    input.campfire_id,
    campfire.name,
    userId,
    "governance",
    `New proposal: ${input.title}`,
    `A new governance proposal has been created in f | ${campfire.name}`,
    `/f/${campfire.name}/proposals/${proposal.id}`,
    {
      campfire_id: input.campfire_id,
      campfire_name: campfire.name,
      proposal_id: proposal.id,
      proposal_title: input.title,
      governance_event: "new_proposal",
      voting_ends_at: votingEndsAt.toISOString(),
    }
  );

  return proposal;
}

// ─── Read Proposals ──────────────────────────────────────────

export async function getProposalById(
  proposalId: string
): Promise<Proposal | null> {
  return queryOne<Proposal>(
    `SELECT p.*,
            u.username AS creator_username,
            c.name AS campfire_name,
            (SELECT COUNT(*)::int FROM campfire_members cm WHERE cm.campfire_id = p.campfire_id) AS member_count
     FROM proposals p
     JOIN users u ON u.id = p.created_by
     JOIN campfires c ON c.id = p.campfire_id
     WHERE p.id = $1`,
    [proposalId]
  );
}

interface ListProposalsResult {
  proposals: Proposal[];
  total: number;
}

export async function listProposals(
  input: ListProposalsInput
): Promise<ListProposalsResult> {
  const conditions: string[] = ["p.campfire_id = $1"];
  const params: unknown[] = [input.campfire_id];
  let paramIdx = 2;

  if (input.status) {
    conditions.push(`p.status = $${paramIdx}`);
    params.push(input.status);
    paramIdx++;
  }

  const whereClause = conditions.join(" AND ");

  // Get total count
  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM proposals p WHERE ${whereClause}`,
    params,
  );
  const total = parseInt(countRow?.count ?? "0", 10);

  const sql = `
    SELECT p.*,
           u.username AS creator_username,
           c.name AS campfire_name,
           (SELECT COUNT(*)::int FROM campfire_members cm WHERE cm.campfire_id = p.campfire_id) AS member_count
    FROM proposals p
    JOIN users u ON u.id = p.created_by
    JOIN campfires c ON c.id = p.campfire_id
    WHERE ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;
  params.push(input.limit, input.offset);

  const proposals = await queryAll<Proposal>(sql, params);
  return { proposals, total };
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
  const membership = await getMembership(userId, proposal.campfire_id);
  if (!membership) {
    throw new GovernanceError(
      "Must be a campfire member to vote on proposals",
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

  // Get campfire for quorum calculation
  const campfire = await queryOne<{
    member_count: number;
    governance_config: Record<string, unknown>;
  }>(
    `SELECT member_count, governance_config FROM campfires WHERE id = $1`,
    [proposal.campfire_id]
  );

  if (!campfire) {
    throw new GovernanceError(
      "Campfire not found",
      "CAMPFIRE_NOT_FOUND",
      404
    );
  }

  const quorumPct =
    typeof campfire.governance_config.quorum_percentage === "number"
      ? campfire.governance_config.quorum_percentage
      : DEFAULT_QUORUM_PERCENTAGE;

  const totalVotes =
    proposal.votes_for + proposal.votes_against + proposal.votes_abstain;
  const quorumRequired = Math.ceil(
    (campfire.member_count * quorumPct) / 100
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
    // DEPRECATED: modify_prompt and addendum_prompt are pre-redesign proposal types.
    // New proposals should use "change_settings" which works with the governance
    // variables system (campfire_settings table + governance_variables registry).
    // These legacy types are kept for backwards compatibility with existing proposals.
    case "modify_prompt": {
      const newPrompt = changes.new_prompt;
      if (typeof newPrompt !== "string") break;

      // Get current version
      const campfire = await queryOne<{
        ai_prompt_version: number;
      }>(
        `SELECT ai_prompt_version FROM campfires WHERE id = $1`,
        [proposal.campfire_id]
      );
      const newVersion = (campfire?.ai_prompt_version ?? 0) + 1;

      // Update campfire prompt
      await query(
        `UPDATE campfires SET ai_prompt = $1, ai_prompt_version = $2
         WHERE id = $3`,
        [newPrompt, newVersion, proposal.campfire_id]
      );

      // Log in prompt history
      await query(
        `INSERT INTO ai_prompt_history
         (entity_type, entity_id, prompt_text, version, created_by, proposal_id)
         VALUES ('campfire', $1, $2, $3, $4, $5)`,
        [
          proposal.campfire_id,
          newPrompt,
          newVersion,
          proposal.created_by,
          proposal.id,
        ]
      );
      break;
    }

    // DEPRECATED: See modify_prompt comment above.
    case "addendum_prompt": {
      const addendum = changes.addendum;
      if (typeof addendum !== "string") break;

      // Get current prompt
      const campfire = await queryOne<{
        ai_prompt: string;
        ai_prompt_version: number;
      }>(
        `SELECT ai_prompt, ai_prompt_version FROM campfires WHERE id = $1`,
        [proposal.campfire_id]
      );
      if (!campfire) break;

      const newPrompt = `${campfire.ai_prompt}\n\n${addendum}`;
      const newVersion = campfire.ai_prompt_version + 1;

      await query(
        `UPDATE campfires SET ai_prompt = $1, ai_prompt_version = $2
         WHERE id = $3`,
        [newPrompt, newVersion, proposal.campfire_id]
      );

      await query(
        `INSERT INTO ai_prompt_history
         (entity_type, entity_id, prompt_text, version, created_by, proposal_id)
         VALUES ('campfire', $1, $2, $3, $4, $5)`,
        [
          proposal.campfire_id,
          newPrompt,
          newVersion,
          proposal.created_by,
          proposal.id,
        ]
      );
      break;
    }

    case "change_settings": {
      // proposed_changes should contain a "settings" object with key-value pairs
      // matching governance variable keys, e.g. { settings: { allow_images: "false", max_post_length: "5000" } }
      const settings = changes.settings;
      if (typeof settings !== "object" || settings === null) break;

      // Apply each setting change via the governance-variables service.
      // This validates against the governance_variables registry, enforces
      // constraints (min/max, allowed_values, data_type), and writes an
      // audit trail to campfire_settings_history.
      const entries = Object.entries(settings as Record<string, unknown>);
      for (const [key, value] of entries) {
        if (typeof value !== "string") continue;
        await updateSetting(
          proposal.campfire_id,
          key,
          value,
          proposal.created_by,
          "proposal",
          proposal.id,
          `Implemented via governance proposal: ${proposal.title}`
        );
      }

      // Also keep governance_config in sync for legacy compatibility
      const campfire = await queryOne<{
        governance_config: Record<string, unknown>;
      }>(
        `SELECT governance_config FROM campfires WHERE id = $1`,
        [proposal.campfire_id]
      );
      if (campfire) {
        const merged = { ...campfire.governance_config, ...settings };
        await query(
          `UPDATE campfires SET governance_config = $1 WHERE id = $2`,
          [JSON.stringify(merged), proposal.campfire_id]
        );
      }
      break;
    }
  }

  // Mark as implemented
  await query(
    `UPDATE proposals SET status = 'implemented', implemented_at = NOW()
     WHERE id = $1`,
    [proposal.id]
  );

  // Notify campfire members about the implemented change (non-blocking)
  const campfireInfo = await queryOne<{ name: string }>(
    `SELECT name FROM campfires WHERE id = $1`,
    [proposal.campfire_id]
  );
  if (campfireInfo) {
    notifyCampfireMembers(
      proposal.campfire_id,
      campfireInfo.name,
      proposal.created_by,
      "campfire_update",
      `Proposal implemented: ${proposal.title}`,
      `The governance proposal '${proposal.title}' has been implemented in f | ${campfireInfo.name}`,
      `/f/${campfireInfo.name}/proposals/${proposal.id}`,
      {
        campfire_id: proposal.campfire_id,
        campfire_name: campfireInfo.name,
        update_type: "proposal_implemented",
        summary: `The governance proposal '${proposal.title}' was approved and implemented.`,
      }
    );
  }
}

// ─── Campfire Notification Helper ────────────────────────────

function notifyCampfireMembers(
  campfireId: string,
  campfireName: string,
  excludeUserId: string,
  type: "governance" | "campfire_update",
  title: string,
  body: string,
  actionUrl: string,
  content: Record<string, unknown>
): void {
  // Fetch all campfire member IDs and send notifications (non-blocking)
  queryAll<{ user_id: string }>(
    `SELECT user_id FROM campfire_members WHERE campfire_id = $1 AND user_id != $2`,
    [campfireId, excludeUserId]
  ).then((members) => {
    for (const member of members) {
      createNotification({
        userId: member.user_id,
        type,
        title,
        body,
        actionUrl,
        content,
      }).catch(() => {}); // Non-blocking per member
    }
  }).catch(() => {}); // Non-blocking
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
