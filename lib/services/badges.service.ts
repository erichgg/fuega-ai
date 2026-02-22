import { queryOne, queryAll } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { ServiceError } from "@/lib/services/posts.service";
import { createNotification } from "@/lib/services/notifications.service";

// ─── Types ───────────────────────────────────────────────────

export interface Badge {
  id: string;
  badge_id: string;
  name: string;
  description: string;
  icon_url: string | null;
  category: string;
  rarity: string;
  version: string;
  earn_criteria: EarnCriteria;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface EarnCriteria {
  type: "threshold" | "one_time" | "referral_count" | "manual";
  metric?: string;
  threshold?: number;
  conditions?: Record<string, unknown>;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  metadata: Record<string, unknown>;
  earned_at: string;
  notified: boolean;
  // joined fields
  name?: string;
  description?: string;
  icon_url?: string | null;
  category?: string;
  rarity?: string;
}

export interface BadgeWithStats extends Badge {
  earned_count: number;
  total_users: number;
  earned_percentage: number;
}

// ─── Rarity sort order (legendary first) ─────────────────────

const RARITY_ORDER: Record<string, number> = {
  legendary: 0,
  epic: 1,
  rare: 2,
  uncommon: 3,
  common: 4,
};

// ─── List all badges ─────────────────────────────────────────

export async function listAllBadges(): Promise<Badge[]> {
  return queryAll<Badge>(
    `SELECT * FROM badges
     WHERE is_active = TRUE
     ORDER BY category, sort_order`
  );
}

// ─── Get single badge with stats ─────────────────────────────

export async function getBadgeById(badgeId: string): Promise<BadgeWithStats | null> {
  const badge = await queryOne<Badge>(
    `SELECT * FROM badges WHERE badge_id = $1 AND is_active = TRUE`,
    [badgeId]
  );
  if (!badge) return null;

  const stats = await queryOne<{ earned_count: string; total_users: string }>(
    `SELECT
       (SELECT COUNT(*) FROM user_badges WHERE badge_id = $1) AS earned_count,
       (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS total_users`,
    [badgeId]
  );

  const earnedCount = parseInt(stats?.earned_count ?? "0", 10);
  const totalUsers = parseInt(stats?.total_users ?? "1", 10);
  const earnedPercentage = totalUsers > 0
    ? Math.round((earnedCount / totalUsers) * 10000) / 100
    : 0;

  return {
    ...badge,
    earned_count: earnedCount,
    total_users: totalUsers,
    earned_percentage: earnedPercentage,
  };
}

// ─── Get user's earned badges ────────────────────────────────

export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  // Verify user exists
  const user = await queryOne<{ id: string }>(
    `SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  if (!user) {
    throw new ServiceError("User not found", "USER_NOT_FOUND", 404);
  }

  const badges = await queryAll<UserBadge>(
    `SELECT ub.id, ub.user_id, ub.badge_id, ub.metadata, ub.earned_at, ub.notified,
            b.name, b.description, b.icon_url, b.category, b.rarity
     FROM user_badges ub
     JOIN badges b ON b.badge_id = ub.badge_id
     WHERE ub.user_id = $1
     ORDER BY
       CASE b.rarity
         WHEN 'legendary' THEN 0
         WHEN 'epic' THEN 1
         WHEN 'rare' THEN 2
         WHEN 'uncommon' THEN 3
         WHEN 'common' THEN 4
       END,
       ub.earned_at DESC`,
    [userId]
  );

  return badges;
}

// ─── Set primary badge ───────────────────────────────────────

export async function setPrimaryBadge(
  userId: string,
  badgeId: string
): Promise<void> {
  // Verify user owns this badge
  const owned = await queryOne<{ id: string }>(
    `SELECT id FROM user_badges WHERE user_id = $1 AND badge_id = $2`,
    [userId, badgeId]
  );
  if (!owned) {
    throw new ServiceError(
      "You do not own this badge",
      "BADGE_NOT_OWNED",
      400
    );
  }

  await queryOne(
    `UPDATE users SET primary_badge = $1 WHERE id = $2 RETURNING id`,
    [badgeId, userId]
  );
}

// ─── Award badge (with pipeline) ─────────────────────────────

export interface AwardResult {
  awarded: boolean;
  reason: "awarded" | "already_owned" | "flag_disabled" | "badge_not_found";
  badge_id: string;
}

export async function awardBadge(
  userId: string,
  badgeId: string,
  metadata: Record<string, unknown> = {}
): Promise<AwardResult> {
  // 1. Verify badge exists
  const badge = await queryOne<Badge>(
    `SELECT * FROM badges WHERE badge_id = $1 AND is_active = TRUE`,
    [badgeId]
  );
  if (!badge) {
    return { awarded: false, reason: "badge_not_found", badge_id: badgeId };
  }

  // 2. Check feature flag
  if (!isFeatureEnabled("ENABLE_BADGE_DISTRIBUTION")) {
    console.log(
      `[badge-eligibility] User ${userId} eligible for "${badgeId}" but ENABLE_BADGE_DISTRIBUTION=false, skipping award`
    );
    return { awarded: false, reason: "flag_disabled", badge_id: badgeId };
  }

  // 3. Idempotency check — user doesn't already have badge
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM user_badges WHERE user_id = $1 AND badge_id = $2`,
    [userId, badgeId]
  );
  if (existing) {
    return { awarded: false, reason: "already_owned", badge_id: badgeId };
  }

  // 4. Award the badge
  await queryOne(
    `INSERT INTO user_badges (user_id, badge_id, metadata)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, badge_id) DO NOTHING
     RETURNING id`,
    [userId, badgeId, JSON.stringify(metadata)]
  );

  // 5. Send notification (uses createNotification which checks feature flag + preferences)
  createNotification({
    userId,
    type: "badge_earned",
    title: `Badge Earned: ${badge.name}`,
    body: badge.description,
    content: {
      badge_id: badgeId,
      badge_name: badge.name,
      badge_rarity: badge.rarity,
      badge_description: badge.description,
    },
  }).catch(() => {}); // Non-blocking

  console.log(`[badge-award] Awarded "${badgeId}" to user ${userId}`);

  return { awarded: true, reason: "awarded", badge_id: badgeId };
}

// ─── Batch award (for eligibility checker) ───────────────────

export async function awardBadges(
  userId: string,
  badgeIds: string[],
  metadataMap: Record<string, Record<string, unknown>> = {}
): Promise<AwardResult[]> {
  const results: AwardResult[] = [];
  for (const badgeId of badgeIds) {
    const result = await awardBadge(userId, badgeId, metadataMap[badgeId] ?? {});
    results.push(result);
  }
  return results;
}
