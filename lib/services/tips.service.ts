import { queryOne, queryAll } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { ServiceError } from "@/lib/services/posts.service";
import { awardBadge } from "@/lib/services/badges.service";
import { createNotification } from "@/lib/services/notifications.service";

// ─── Types ───────────────────────────────────────────────────

export interface Tip {
  id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  stripe_payment_id: string;
  recurring: boolean;
  stripe_subscription_id: string | null;
  message: string | null;
  created_at: string;
}

export interface ActiveSubscription {
  stripe_subscription_id: string;
  amount_cents: number;
  status: string;
  current_period_end: string;
}

export interface PublicSupporter {
  username: string;
  amount_cents: number;
  message: string | null;
  created_at: string;
  recurring: boolean;
}

export interface SupportersSummary {
  supporters: PublicSupporter[];
  total_lifetime_cents: number;
  current_monthly_recurring_cents: number;
}

// ─── Feature Flag Guard ─────────────────────────────────────

export function ensureTipJarEnabled(): void {
  if (!isFeatureEnabled("ENABLE_TIP_JAR")) {
    throw new ServiceError("Tip jar is not available", "FEATURE_DISABLED", 403);
  }
}

// ─── Record a Tip ───────────────────────────────────────────

export async function recordTip(
  userId: string,
  amountCents: number,
  stripePaymentId: string,
  recurring: boolean,
  stripeSubscriptionId: string | null = null,
  message: string | null = null
): Promise<Tip> {
  // Idempotent — skip if stripe_payment_id already recorded
  const existing = await queryOne<Tip>(
    `SELECT * FROM tips WHERE stripe_payment_id = $1`,
    [stripePaymentId]
  );
  if (existing) return existing;

  const tip = await queryOne<Tip>(
    `INSERT INTO tips (user_id, amount_cents, stripe_payment_id, recurring, stripe_subscription_id, message)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, amountCents, stripePaymentId, recurring, stripeSubscriptionId, message]
  );

  if (!tip) {
    throw new ServiceError("Failed to record tip", "TIP_INSERT_FAILED", 500);
  }

  return tip;
}

// ─── Badge Awards ───────────────────────────────────────────

export async function awardSupporterBadge(userId: string): Promise<void> {
  await awardBadge(userId, "supporter", { source: "tip" });
}

export async function awardRecurringSupporterBadge(userId: string): Promise<void> {
  await awardBadge(userId, "recurring_supporter", { source: "recurring_tip" });
}

export async function revokeRecurringSupporterBadge(userId: string): Promise<void> {
  await queryOne(
    `DELETE FROM user_badges WHERE user_id = $1 AND badge_id = 'recurring_supporter'`,
    [userId]
  );
  console.log(`[tips] Revoked recurring_supporter badge for user ${userId}`);
}

// ─── Notify Tip Received ────────────────────────────────────

export async function notifyTipReceived(
  userId: string,
  amountCents: number,
  recurring: boolean
): Promise<void> {
  const dollars = (amountCents / 100).toFixed(2);
  const tipType = recurring ? "recurring monthly" : "one-time";
  createNotification({
    userId,
    type: "tip_received",
    title: "Tip Received!",
    body: `Thank you for your $${dollars} ${tipType} tip!`,
    content: { amount_cents: amountCents, recurring },
  }).catch(() => {}); // Non-blocking
}

// ─── Get User Subscriptions ─────────────────────────────────

export async function getUserSubscriptions(
  userId: string
): Promise<ActiveSubscription[]> {
  ensureTipJarEnabled();

  // We store subscription info in tips table. For active subs, query Stripe.
  // But since we only track what Stripe tells us, we return the latest tip
  // per subscription_id and let the route layer query Stripe for live status.
  const subs = await queryAll<{
    stripe_subscription_id: string;
    amount_cents: number;
    created_at: string;
  }>(
    `SELECT DISTINCT ON (stripe_subscription_id)
       stripe_subscription_id, amount_cents, created_at
     FROM tips
     WHERE user_id = $1
       AND recurring = TRUE
       AND stripe_subscription_id IS NOT NULL
     ORDER BY stripe_subscription_id, created_at DESC`,
    [userId]
  );

  return subs.map((s) => ({
    stripe_subscription_id: s.stripe_subscription_id,
    amount_cents: s.amount_cents,
    status: "active", // Will be enriched by route from Stripe
    current_period_end: s.created_at, // Placeholder, enriched by Stripe
  }));
}

// ─── Find User by Subscription ──────────────────────────────

export async function findUserBySubscriptionId(
  subscriptionId: string
): Promise<string | null> {
  const row = await queryOne<{ user_id: string }>(
    `SELECT DISTINCT user_id FROM tips
     WHERE stripe_subscription_id = $1 AND recurring = TRUE
     LIMIT 1`,
    [subscriptionId]
  );
  return row?.user_id ?? null;
}

// ─── Public Supporters Page ─────────────────────────────────

export async function getPublicSupporters(
  limit: number = 50
): Promise<SupportersSummary> {
  // Get recent tips from users who haven't opted out
  const supporters = await queryAll<PublicSupporter>(
    `SELECT u.username, t.amount_cents, t.message, t.created_at, t.recurring
     FROM tips t
     JOIN users u ON u.id = t.user_id AND u.deleted_at IS NULL
     WHERE COALESCE((u.notification_preferences->>'tip_received'), 'true') != 'false'
     ORDER BY t.created_at DESC
     LIMIT $1`,
    [limit]
  );

  // Total lifetime
  const lifetimeRow = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(amount_cents), 0)::text AS total FROM tips`
  );
  const totalLifetimeCents = parseInt(lifetimeRow?.total ?? "0", 10);

  // Current monthly recurring total (tips from active recurring subscriptions)
  // We approximate: sum of the most recent tip per active subscription
  const monthlyRow = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(sub.amount_cents), 0)::text AS total
     FROM (
       SELECT DISTINCT ON (stripe_subscription_id) amount_cents
       FROM tips
       WHERE recurring = TRUE
         AND stripe_subscription_id IS NOT NULL
       ORDER BY stripe_subscription_id, created_at DESC
     ) sub`
  );
  const currentMonthlyRecurringCents = parseInt(monthlyRow?.total ?? "0", 10);

  return {
    supporters,
    total_lifetime_cents: totalLifetimeCents,
    current_monthly_recurring_cents: currentMonthlyRecurringCents,
  };
}

// ─── Check if User Has Any Tips ─────────────────────────────

export async function userHasTipped(userId: string): Promise<boolean> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM tips WHERE user_id = $1`,
    [userId]
  );
  return parseInt(row?.count ?? "0", 10) > 0;
}

export async function userHasRecurringTip(userId: string): Promise<boolean> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM tips
     WHERE user_id = $1 AND recurring = TRUE AND stripe_subscription_id IS NOT NULL`,
    [userId]
  );
  return parseInt(row?.count ?? "0", 10) > 0;
}
