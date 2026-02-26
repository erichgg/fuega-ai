import { query, queryOne, queryAll } from "@/lib/db";
import type {
  CreateCampfireInput,
  UpdateCampfireInput,
  ListCampfiresInput,
} from "@/lib/validation/campfires";

// ─── Types ───────────────────────────────────────────────────

export interface Campfire {
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
  member_count: number;
  post_count: number;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  deleted_at: string | null;
  creator_username?: string;
  banner_url?: string | null;
  theme_color?: string | null;
  tagline?: string | null;
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

export interface CampfireMembership {
  id: string;
  user_id: string;
  campfire_id: string;
  joined_at: string;
  role: string;
}

// ─── Default AI Prompts ─────────────────────────────────────

const DEFAULT_AI_PROMPT =
  "You are a campfire AI agent for a discussion forum. Allow discussions, questions, tutorials, and news. Remove spam, personal attacks, and off-topic content. Flag low-effort posts for review.";

// ─── Create ──────────────────────────────────────────────────

export async function createCampfire(
  input: CreateCampfireInput,
  userId: string
): Promise<Campfire> {
  // Check if name is already taken
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM campfires WHERE name = $1`,
    [input.name]
  );
  if (existing) {
    throw new ServiceError(
      "Campfire name is already taken",
      "NAME_TAKEN",
      409
    );
  }

  const aiPrompt = DEFAULT_AI_PROMPT;

  const campfire = await queryOne<Campfire>(
    `INSERT INTO campfires
     (name, display_name, description, ai_prompt, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.name,
      input.display_name,
      input.description,
      aiPrompt,
      userId,
    ]
  );

  if (!campfire) {
    throw new ServiceError(
      "Failed to create campfire",
      "INTERNAL_ERROR",
      500
    );
  }

  // Auto-join the creator as admin
  await query(
    `INSERT INTO campfire_members (user_id, campfire_id, role)
     VALUES ($1, $2, 'admin')`,
    [userId, campfire.id]
  );

  // Update member count
  await query(
    `UPDATE campfires SET member_count = 1 WHERE id = $1`,
    [campfire.id]
  );

  // Log initial prompt in history
  await query(
    `INSERT INTO ai_prompt_history (entity_type, entity_id, prompt_text, version, created_by)
     VALUES ('campfire', $1, $2, 1, $3)`,
    [campfire.id, aiPrompt, userId]
  );

  return { ...campfire, member_count: 1 };
}

// ─── Read ────────────────────────────────────────────────────

export async function getCampfireById(
  campfireId: string
): Promise<Campfire | null> {
  return queryOne<Campfire>(
    `SELECT c.*,
            u.username AS creator_username
     FROM campfires c
     LEFT JOIN users u ON u.id = c.created_by
     WHERE c.id = $1 AND c.deleted_at IS NULL`,
    [campfireId]
  );
}

export async function getCampfireByName(
  name: string
): Promise<Campfire | null> {
  return queryOne<Campfire>(
    `SELECT c.*,
            u.username AS creator_username
     FROM campfires c
     LEFT JOIN users u ON u.id = c.created_by
     WHERE c.name = $1 AND c.deleted_at IS NULL`,
    [name]
  );
}

export async function listCampfires(
  input: ListCampfiresInput
): Promise<Campfire[]> {
  const conditions: string[] = [
    "c.deleted_at IS NULL",
    "c.is_banned = FALSE",
  ];
  const params: unknown[] = [];
  let paramIdx = 1;

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
           u.username AS creator_username
    FROM campfires c
    LEFT JOIN users u ON u.id = c.created_by
    WHERE ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;
  params.push(input.limit, input.offset);

  return queryAll<Campfire>(sql, params);
}

// ─── Update ──────────────────────────────────────────────────

export async function updateCampfire(
  campfireId: string,
  userId: string,
  input: UpdateCampfireInput
): Promise<Campfire> {
  // Verify campfire exists
  const existing = await getCampfireById(campfireId);
  if (!existing) {
    throw new ServiceError("Campfire not found", "CAMPFIRE_NOT_FOUND", 404);
  }

  // Verify user is admin of this campfire
  const membership = await queryOne<CampfireMembership>(
    `SELECT * FROM campfire_members
     WHERE user_id = $1 AND campfire_id = $2`,
    [userId, campfireId]
  );
  if (!membership || membership.role !== "admin") {
    throw new ServiceError(
      "Only campfire admins can update campfire settings",
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

  params.push(campfireId);

  const updated = await queryOne<Campfire>(
    `UPDATE campfires SET ${updates.join(", ")} WHERE id = $${paramIdx} RETURNING *`,
    params
  );

  if (!updated) {
    throw new ServiceError(
      "Failed to update campfire",
      "INTERNAL_ERROR",
      500
    );
  }

  return updated;
}

// ─── Join / Leave ────────────────────────────────────────────

export async function joinCampfire(
  campfireId: string,
  userId: string
): Promise<CampfireMembership> {
  // Verify campfire exists
  const campfire = await queryOne<{ id: string; is_banned: boolean }>(
    `SELECT id, is_banned FROM campfires WHERE id = $1 AND deleted_at IS NULL`,
    [campfireId]
  );
  if (!campfire) {
    throw new ServiceError("Campfire not found", "CAMPFIRE_NOT_FOUND", 404);
  }
  if (campfire.is_banned) {
    throw new ServiceError("Campfire is banned", "CAMPFIRE_BANNED", 403);
  }

  // Check if already a member
  const existing = await queryOne<CampfireMembership>(
    `SELECT * FROM campfire_members WHERE user_id = $1 AND campfire_id = $2`,
    [userId, campfireId]
  );
  if (existing) {
    throw new ServiceError(
      "Already a member of this campfire",
      "ALREADY_MEMBER",
      409
    );
  }

  const membership = await queryOne<CampfireMembership>(
    `INSERT INTO campfire_members (user_id, campfire_id, role)
     VALUES ($1, $2, 'member')
     RETURNING *`,
    [userId, campfireId]
  );

  if (!membership) {
    throw new ServiceError("Failed to join campfire", "INTERNAL_ERROR", 500);
  }

  // Increment member count
  await query(
    `UPDATE campfires SET member_count = member_count + 1 WHERE id = $1`,
    [campfireId]
  );

  return membership;
}

export async function leaveCampfire(
  campfireId: string,
  userId: string
): Promise<void> {
  // Verify campfire exists
  const campfire = await queryOne<{ id: string }>(
    `SELECT id FROM campfires WHERE id = $1 AND deleted_at IS NULL`,
    [campfireId]
  );
  if (!campfire) {
    throw new ServiceError("Campfire not found", "CAMPFIRE_NOT_FOUND", 404);
  }

  // Check membership
  const membership = await queryOne<CampfireMembership>(
    `SELECT * FROM campfire_members WHERE user_id = $1 AND campfire_id = $2`,
    [userId, campfireId]
  );
  if (!membership) {
    throw new ServiceError(
      "Not a member of this campfire",
      "NOT_MEMBER",
      404
    );
  }

  // Cannot leave if you're the only admin
  if (membership.role === "admin") {
    const adminCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM campfire_members
       WHERE campfire_id = $1 AND role = 'admin'`,
      [campfireId]
    );
    if (adminCount && parseInt(adminCount.count, 10) <= 1) {
      throw new ServiceError(
        "Cannot leave campfire as the only admin. Transfer admin role first.",
        "LAST_ADMIN",
        400
      );
    }
  }

  // Remove membership
  await query(
    `DELETE FROM campfire_members WHERE user_id = $1 AND campfire_id = $2`,
    [userId, campfireId]
  );

  // Decrement member count
  await query(
    `UPDATE campfires SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1`,
    [campfireId]
  );
}

// ─── Helpers ─────────────────────────────────────────────────

export async function getMembership(
  userId: string,
  campfireId: string
): Promise<CampfireMembership | null> {
  return queryOne<CampfireMembership>(
    `SELECT * FROM campfire_members WHERE user_id = $1 AND campfire_id = $2`,
    [userId, campfireId]
  );
}

export async function isAdmin(
  userId: string,
  campfireId: string
): Promise<boolean> {
  const membership = await getMembership(userId, campfireId);
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
