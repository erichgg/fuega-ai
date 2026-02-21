import { query, queryOne, queryAll } from "@/lib/db";
import type {
  CreateCommunityInput,
  UpdateCommunityInput,
  ListCommunitiesInput,
} from "@/lib/validation/communities";

// ─── Types ───────────────────────────────────────────────────

export interface Community {
  id: string;
  name: string;
  display_name: string;
  description: string;
  ai_prompt: string;
  ai_prompt_version: number;
  governance_config: GovernanceConfig;
  created_at: string;
  updated_at: string;
  created_by: string;
  category_id: string | null;
  member_count: number;
  post_count: number;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  deleted_at: string | null;
  category_name?: string;
  creator_username?: string;
}

export interface GovernanceConfig {
  voting_type: string;
  quorum_percentage: number;
  proposal_discussion_hours: number;
  proposal_voting_hours: number;
  spark_required_to_post: number;
  spark_required_to_vote: number;
  account_age_required_days: number;
}

export interface CommunityMembership {
  id: string;
  user_id: string;
  community_id: string;
  joined_at: string;
  role: string;
}

// ─── Default AI Prompts per Category ─────────────────────────

const DEFAULT_AI_PROMPTS: Record<string, string> = {
  technology:
    "You are a community AI agent for a technology discussion forum. Allow technical discussions, questions, tutorials, and news. Remove spam, personal attacks, and off-topic content. Flag low-effort posts for review.",
  science:
    "You are a community AI agent for a science discussion forum. Encourage evidence-based discussion, research sharing, and scientific inquiry. Remove misinformation, pseudoscience, and personal attacks.",
  politics:
    "You are a community AI agent for a political discussion forum. Allow diverse political viewpoints and civil debate. Remove personal attacks, hate speech, and deliberate misinformation. Flag highly divisive content for review.",
  entertainment:
    "You are a community AI agent for an entertainment discussion forum. Allow discussions about movies, TV, music, games, and culture. Remove spam, spoilers without tags, and personal attacks.",
  sports:
    "You are a community AI agent for a sports discussion forum. Allow game discussions, analysis, player news, and fan engagement. Remove personal attacks, hate speech, and spam.",
};

// ─── Create ──────────────────────────────────────────────────

export async function createCommunity(
  input: CreateCommunityInput,
  userId: string
): Promise<Community> {
  // Check if name is already taken
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM communities WHERE name = $1`,
    [input.name]
  );
  if (existing) {
    throw new ServiceError(
      "Community name is already taken",
      "NAME_TAKEN",
      409
    );
  }

  // Find category
  const category = await queryOne<{ id: string }>(
    `SELECT id FROM categories WHERE name = $1`,
    [input.category]
  );

  const aiPrompt =
    DEFAULT_AI_PROMPTS[input.category] ?? DEFAULT_AI_PROMPTS.technology;

  const community = await queryOne<Community>(
    `INSERT INTO communities
     (name, display_name, description, ai_prompt, created_by, category_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.name,
      input.display_name,
      input.description,
      aiPrompt,
      userId,
      category?.id ?? null,
    ]
  );

  if (!community) {
    throw new ServiceError(
      "Failed to create community",
      "INTERNAL_ERROR",
      500
    );
  }

  // Auto-join the creator as admin
  await query(
    `INSERT INTO community_memberships (user_id, community_id, role)
     VALUES ($1, $2, 'admin')`,
    [userId, community.id]
  );

  // Update member count
  await query(
    `UPDATE communities SET member_count = 1 WHERE id = $1`,
    [community.id]
  );

  // Log initial prompt in history
  await query(
    `INSERT INTO ai_prompt_history (entity_type, entity_id, prompt_text, version, created_by)
     VALUES ('community', $1, $2, 1, $3)`,
    [community.id, aiPrompt, userId]
  );

  return { ...community, member_count: 1 };
}

// ─── Read ────────────────────────────────────────────────────

export async function getCommunityById(
  communityId: string
): Promise<Community | null> {
  return queryOne<Community>(
    `SELECT c.*,
            cat.name AS category_name,
            u.username AS creator_username
     FROM communities c
     LEFT JOIN categories cat ON cat.id = c.category_id
     LEFT JOIN users u ON u.id = c.created_by
     WHERE c.id = $1 AND c.deleted_at IS NULL`,
    [communityId]
  );
}

export async function getCommunityByName(
  name: string
): Promise<Community | null> {
  return queryOne<Community>(
    `SELECT c.*,
            cat.name AS category_name,
            u.username AS creator_username
     FROM communities c
     LEFT JOIN categories cat ON cat.id = c.category_id
     LEFT JOIN users u ON u.id = c.created_by
     WHERE c.name = $1 AND c.deleted_at IS NULL`,
    [name]
  );
}

export async function listCommunities(
  input: ListCommunitiesInput
): Promise<Community[]> {
  const conditions: string[] = [
    "c.deleted_at IS NULL",
    "c.is_banned = FALSE",
  ];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (input.category) {
    conditions.push(`cat.name = $${paramIdx}`);
    params.push(input.category);
    paramIdx++;
  }

  const whereClause = conditions.join(" AND ");

  let orderBy: string;
  switch (input.sort) {
    case "activity":
      orderBy = "c.post_count DESC, c.member_count DESC";
      break;
    case "created_at":
      orderBy = "c.created_at DESC";
      break;
    case "members":
    default:
      orderBy = "c.member_count DESC, c.created_at DESC";
      break;
  }

  const sql = `
    SELECT c.*,
           cat.name AS category_name,
           u.username AS creator_username
    FROM communities c
    LEFT JOIN categories cat ON cat.id = c.category_id
    LEFT JOIN users u ON u.id = c.created_by
    WHERE ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;
  params.push(input.limit, input.offset);

  return queryAll<Community>(sql, params);
}

// ─── Update ──────────────────────────────────────────────────

export async function updateCommunity(
  communityId: string,
  userId: string,
  input: UpdateCommunityInput
): Promise<Community> {
  // Verify community exists
  const existing = await getCommunityById(communityId);
  if (!existing) {
    throw new ServiceError("Community not found", "COMMUNITY_NOT_FOUND", 404);
  }

  // Verify user is admin of this community
  const membership = await queryOne<CommunityMembership>(
    `SELECT * FROM community_memberships
     WHERE user_id = $1 AND community_id = $2`,
    [userId, communityId]
  );
  if (!membership || membership.role !== "admin") {
    throw new ServiceError(
      "Only community admins can update community settings",
      "FORBIDDEN",
      403
    );
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (input.display_name !== undefined) {
    updates.push(`display_name = $${paramIdx}`);
    params.push(input.display_name);
    paramIdx++;
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIdx}`);
    params.push(input.description);
    paramIdx++;
  }

  if (updates.length === 0) {
    return existing;
  }

  params.push(communityId);

  const updated = await queryOne<Community>(
    `UPDATE communities SET ${updates.join(", ")} WHERE id = $${paramIdx} RETURNING *`,
    params
  );

  if (!updated) {
    throw new ServiceError(
      "Failed to update community",
      "INTERNAL_ERROR",
      500
    );
  }

  return updated;
}

// ─── Join / Leave ────────────────────────────────────────────

export async function joinCommunity(
  communityId: string,
  userId: string
): Promise<CommunityMembership> {
  // Verify community exists
  const community = await queryOne<{ id: string; is_banned: boolean }>(
    `SELECT id, is_banned FROM communities WHERE id = $1 AND deleted_at IS NULL`,
    [communityId]
  );
  if (!community) {
    throw new ServiceError("Community not found", "COMMUNITY_NOT_FOUND", 404);
  }
  if (community.is_banned) {
    throw new ServiceError("Community is banned", "COMMUNITY_BANNED", 403);
  }

  // Check if already a member
  const existing = await queryOne<CommunityMembership>(
    `SELECT * FROM community_memberships WHERE user_id = $1 AND community_id = $2`,
    [userId, communityId]
  );
  if (existing) {
    throw new ServiceError(
      "Already a member of this community",
      "ALREADY_MEMBER",
      409
    );
  }

  const membership = await queryOne<CommunityMembership>(
    `INSERT INTO community_memberships (user_id, community_id, role)
     VALUES ($1, $2, 'member')
     RETURNING *`,
    [userId, communityId]
  );

  if (!membership) {
    throw new ServiceError("Failed to join community", "INTERNAL_ERROR", 500);
  }

  // Increment member count
  await query(
    `UPDATE communities SET member_count = member_count + 1 WHERE id = $1`,
    [communityId]
  );

  return membership;
}

export async function leaveCommunity(
  communityId: string,
  userId: string
): Promise<void> {
  // Verify community exists
  const community = await queryOne<{ id: string }>(
    `SELECT id FROM communities WHERE id = $1 AND deleted_at IS NULL`,
    [communityId]
  );
  if (!community) {
    throw new ServiceError("Community not found", "COMMUNITY_NOT_FOUND", 404);
  }

  // Check membership
  const membership = await queryOne<CommunityMembership>(
    `SELECT * FROM community_memberships WHERE user_id = $1 AND community_id = $2`,
    [userId, communityId]
  );
  if (!membership) {
    throw new ServiceError(
      "Not a member of this community",
      "NOT_MEMBER",
      404
    );
  }

  // Cannot leave if you're the only admin
  if (membership.role === "admin") {
    const adminCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM community_memberships
       WHERE community_id = $1 AND role = 'admin'`,
      [communityId]
    );
    if (adminCount && parseInt(adminCount.count, 10) <= 1) {
      throw new ServiceError(
        "Cannot leave community as the only admin. Transfer admin role first.",
        "LAST_ADMIN",
        400
      );
    }
  }

  // Remove membership
  await query(
    `DELETE FROM community_memberships WHERE user_id = $1 AND community_id = $2`,
    [userId, communityId]
  );

  // Decrement member count
  await query(
    `UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1`,
    [communityId]
  );
}

// ─── Helpers ─────────────────────────────────────────────────

export async function getMembership(
  userId: string,
  communityId: string
): Promise<CommunityMembership | null> {
  return queryOne<CommunityMembership>(
    `SELECT * FROM community_memberships WHERE user_id = $1 AND community_id = $2`,
    [userId, communityId]
  );
}

export async function isAdmin(
  userId: string,
  communityId: string
): Promise<boolean> {
  const membership = await getMembership(userId, communityId);
  return membership?.role === "admin";
}

// ─── Service Error ───────────────────────────────────────────

export class ServiceError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.status = status;
  }
}
