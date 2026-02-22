import { randomBytes } from "crypto";
import { query, queryOne, queryAll } from "@/lib/db";
import { ServiceError } from "@/lib/services/posts.service";
import { awardBadge } from "@/lib/services/badges.service";
import { createNotification } from "@/lib/services/notifications.service";

// ─── Types ───────────────────────────────────────────────────

export interface Referral {
  id: string;
  referrer_id: string;
  referee_id: string;
  referral_link: string;
  ip_hash: string | null;
  reverted: boolean;
  created_at: string;
}

export interface ReferralHistoryEntry {
  id: string;
  referee_username: string;
  created_at: string;
  status: "active" | "reverted";
}

export interface ReferralStats {
  referral_count: number;
  next_badge_at: number | null;
  next_badge_name: string | null;
  current_badge: string | null;
}

// ─── Badge thresholds ────────────────────────────────────────

const REFERRAL_BADGE_THRESHOLDS = [
  { count: 1, badge_id: "first_referral", name: "Spark Spreader" },
  { count: 5, badge_id: "v1_ambassador", name: "V1 Ambassador" },
  { count: 25, badge_id: "v1_influencer", name: "V1 Influencer" },
  { count: 100, badge_id: "v1_legend", name: "V1 Legend" },
] as const;

// ─── Generate referral code ──────────────────────────────────

function generateReferralCode(): string {
  return randomBytes(4).toString("hex"); // 8 hex chars
}

// ─── Get or create referral link ─────────────────────────────

export async function getReferralLink(userId: string): Promise<string> {
  // Check if user already has a referral code
  const user = await queryOne<{ referral_code: string | null }>(
    `SELECT referral_code FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  if (!user) {
    throw new ServiceError("User not found", "USER_NOT_FOUND", 404);
  }

  if (user.referral_code) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fuega.ai";
    return `${baseUrl}/join?ref=${user.referral_code}`;
  }

  // Lazy-generate a referral code
  let code = generateReferralCode();
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM users WHERE referral_code = $1`,
      [code]
    );
    if (!existing) break;
    code = generateReferralCode();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new ServiceError(
      "Failed to generate unique referral code",
      "REFERRAL_CODE_GENERATION_FAILED",
      500
    );
  }

  await query(
    `UPDATE users SET referral_code = $1 WHERE id = $2`,
    [code, userId]
  );

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fuega.ai";
  return `${baseUrl}/join?ref=${code}`;
}

// ─── Get referral stats ──────────────────────────────────────

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const user = await queryOne<{ referral_count: number }>(
    `SELECT referral_count FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  if (!user) {
    throw new ServiceError("User not found", "USER_NOT_FOUND", 404);
  }

  const count = user.referral_count;

  // Determine current badge (highest achieved)
  let currentBadge: string | null = null;
  for (const threshold of REFERRAL_BADGE_THRESHOLDS) {
    if (count >= threshold.count) {
      currentBadge = threshold.name;
    }
  }

  // Determine next badge
  let nextBadgeAt: number | null = null;
  let nextBadgeName: string | null = null;
  for (const threshold of REFERRAL_BADGE_THRESHOLDS) {
    if (count < threshold.count) {
      nextBadgeAt = threshold.count;
      nextBadgeName = threshold.name;
      break;
    }
  }

  return {
    referral_count: count,
    next_badge_at: nextBadgeAt,
    next_badge_name: nextBadgeName,
    current_badge: currentBadge,
  };
}

// ─── Get referral history ────────────────────────────────────

export async function getReferralHistory(userId: string): Promise<ReferralHistoryEntry[]> {
  const user = await queryOne<{ id: string }>(
    `SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  if (!user) {
    throw new ServiceError("User not found", "USER_NOT_FOUND", 404);
  }

  const rows = await queryAll<{
    id: string;
    referee_username: string;
    created_at: string;
    reverted: boolean;
  }>(
    `SELECT r.id, u.username AS referee_username, r.created_at, r.reverted
     FROM referrals r
     JOIN users u ON u.id = r.referee_id
     WHERE r.referrer_id = $1
     ORDER BY r.created_at DESC`,
    [userId]
  );

  return rows.map((row) => ({
    id: row.id,
    referee_username: row.referee_username,
    created_at: row.created_at,
    status: row.reverted ? "reverted" as const : "active" as const,
  }));
}

// ─── Process referral on signup ──────────────────────────────

export interface ProcessReferralInput {
  referralCode: string;
  newUserId: string;
  newUserIpHash: string;
}

export interface ProcessReferralResult {
  processed: boolean;
  reason:
    | "success"
    | "invalid_code"
    | "self_referral"
    | "same_ip"
    | "account_too_new"
    | "rate_limited"
    | "already_referred"
    | "error";
}

export async function processReferral(
  input: ProcessReferralInput
): Promise<ProcessReferralResult> {
  const { referralCode, newUserId, newUserIpHash } = input;

  try {
    // 1. Look up referrer by code
    const referrer = await queryOne<{
      id: string;
      ip_address_hash: string | null;
      created_at: string;
      referral_count: number;
    }>(
      `SELECT id, ip_address_hash, created_at, referral_count
       FROM users
       WHERE referral_code = $1 AND deleted_at IS NULL`,
      [referralCode]
    );

    if (!referrer) {
      return { processed: false, reason: "invalid_code" };
    }

    // 2. Self-referral check
    if (referrer.id === newUserId) {
      return { processed: false, reason: "self_referral" };
    }

    // 3. Same IP check
    if (referrer.ip_address_hash && referrer.ip_address_hash === newUserIpHash) {
      return { processed: false, reason: "same_ip" };
    }

    // 4. Account age check — referrer must be >= 24 hours old
    const referrerCreated = new Date(referrer.created_at);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (referrerCreated > twentyFourHoursAgo) {
      return { processed: false, reason: "account_too_new" };
    }

    // 5. Duplicate referee check
    const existingReferral = await queryOne<{ id: string }>(
      `SELECT id FROM referrals WHERE referee_id = $1`,
      [newUserId]
    );
    if (existingReferral) {
      return { processed: false, reason: "already_referred" };
    }

    // 6. Rate limit — max 10 referral signups per hour per referrer IP
    if (referrer.ip_address_hash) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentCount = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM referrals
         WHERE referrer_id = $1 AND created_at > $2`,
        [referrer.id, hourAgo.toISOString()]
      );
      if (parseInt(recentCount?.count ?? "0", 10) >= 10) {
        return { processed: false, reason: "rate_limited" };
      }
    }

    // 7. Insert referral record (trigger will increment referral_count)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fuega.ai";
    const referralLink = `${baseUrl}/join?ref=${referralCode}`;

    await queryOne(
      `INSERT INTO referrals (referrer_id, referee_id, referral_link, ip_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [referrer.id, newUserId, referralLink, newUserIpHash]
    );

    // 8. Update referred_by on the new user
    await query(
      `UPDATE users SET referred_by = $1 WHERE id = $2`,
      [referrer.id, newUserId]
    );

    // 9. Check badge eligibility (count was incremented by trigger)
    const updatedCount = referrer.referral_count + 1;
    await checkReferralBadges(referrer.id, updatedCount);

    // 10. Send notification to referrer (non-blocking)
    const newUser = await queryOne<{ username: string }>(
      `SELECT username FROM users WHERE id = $1`,
      [newUserId]
    );

    const nextBadge = REFERRAL_BADGE_THRESHOLDS.find(
      (t) => updatedCount < t.count
    );

    createNotification({
      userId: referrer.id,
      type: "referral",
      title: "New referral!",
      body: `${newUser?.username ?? "Someone"} joined using your referral link.`,
      content: {
        referee_username: newUser?.username ?? "unknown",
        referral_count: updatedCount,
        next_badge_at: nextBadge?.count ?? null,
        next_badge_name: nextBadge?.name ?? null,
      },
    }).catch(() => {}); // Non-blocking

    return { processed: true, reason: "success" };
  } catch (err) {
    console.error("[referral] Error processing referral:", err);
    return { processed: false, reason: "error" };
  }
}

// ─── Badge eligibility check ────────────────────────────────

async function checkReferralBadges(
  userId: string,
  currentCount: number
): Promise<void> {
  for (const threshold of REFERRAL_BADGE_THRESHOLDS) {
    if (currentCount >= threshold.count) {
      await awardBadge(userId, threshold.badge_id);
    }
  }
}

// ─── Referral reversion (for daily cron) ─────────────────────

export async function revertBannedReferrals(): Promise<number> {
  // Find referrals where the referee was banned within 7 days and not yet reverted
  const toRevert = await queryAll<{
    id: string;
    referrer_id: string;
    referee_id: string;
  }>(
    `SELECT r.id, r.referrer_id, r.referee_id
     FROM referrals r
     JOIN users u ON u.id = r.referee_id
     WHERE r.reverted = FALSE
       AND u.deleted_at IS NOT NULL
       AND u.deleted_at <= r.created_at + INTERVAL '7 days'`
  );

  let revertedCount = 0;

  for (const referral of toRevert) {
    // Mark referral as reverted
    await query(
      `UPDATE referrals SET reverted = TRUE WHERE id = $1`,
      [referral.id]
    );

    // Decrement referrer count (with floor of 0)
    await query(
      `UPDATE users SET referral_count = GREATEST(referral_count - 1, 0)
       WHERE id = $1`,
      [referral.referrer_id]
    );

    // Re-check badge eligibility — fetch updated count
    const updated = await queryOne<{ referral_count: number }>(
      `SELECT referral_count FROM users WHERE id = $1`,
      [referral.referrer_id]
    );

    if (updated) {
      // Note: badge reversion is not implemented in V1 — badges are permanent
      // except for specific revocable badges. Referral badges stay once earned.
      // This is a design decision per GAMIFICATION.md badge display rules.
      console.log(
        `[referral-revert] Reverted referral ${referral.id}, ` +
        `referrer ${referral.referrer_id} now at ${updated.referral_count} referrals`
      );
    }

    revertedCount++;
  }

  return revertedCount;
}
