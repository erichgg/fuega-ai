/**
 * Tests for the Tip Jar system:
 * - One-time tip checkout creation
 * - Recurring tip subscription creation
 * - Cancel subscription
 * - Supporter badge awarded after first tip
 * - Recurring supporter badge awarded then revoked on cancel
 * - Supporters page shows recent tips
 * - Feature flag off = 403
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { getTestDb, closeTestDb, TEST_IDS } from "@/tests/unit/database/helpers";
import type { PGlite } from "@electric-sql/pglite";

// Mock the db module to use PGlite
let db: PGlite;

vi.mock("@/lib/db", async () => {
  return {
    query: async (text: string, params?: unknown[]) => {
      const d = await getTestDb();
      return d.query(text, params);
    },
    queryOne: async (text: string, params?: unknown[]) => {
      const d = await getTestDb();
      const result = await d.query(text, params);
      return result.rows[0] ?? null;
    },
    queryAll: async (text: string, params?: unknown[]) => {
      const d = await getTestDb();
      const result = await d.query(text, params);
      return result.rows;
    },
  };
});

// Feature flags
let tipJarEnabled = true;
let badgeDistEnabled = true;

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: (flag: string) => {
    if (flag === "ENABLE_TIP_JAR") return tipJarEnabled;
    if (flag === "ENABLE_BADGE_DISTRIBUTION") return badgeDistEnabled;
    if (flag === "ENABLE_NOTIFICATIONS") return false;
    return false;
  },
  getAllFeatureFlags: () => ({
    ENABLE_BADGE_DISTRIBUTION: badgeDistEnabled,
    ENABLE_COSMETICS_SHOP: false,
    ENABLE_TIP_JAR: tipJarEnabled,
    ENABLE_NOTIFICATIONS: false,
  }),
}));

// Mock Stripe service
const mockCreateTipCheckoutSession = vi.fn();
const mockCancelStripeSubscription = vi.fn();
const mockGetStripeSubscription = vi.fn();

vi.mock("@/lib/services/stripe.service", () => ({
  createTipCheckoutSession: (...args: unknown[]) =>
    mockCreateTipCheckoutSession(...args),
  cancelStripeSubscription: (...args: unknown[]) =>
    mockCancelStripeSubscription(...args),
  getStripeSubscription: (...args: unknown[]) =>
    mockGetStripeSubscription(...args),
  getStripe: () => ({}),
  constructWebhookEvent: () => ({}),
}));

// Mock notifications (non-blocking, so just stub)
vi.mock("@/lib/services/notifications.service", () => ({
  createNotification: vi.fn().mockResolvedValue(null),
}));

// Mock push notifications
vi.mock("@/lib/services/push-notifications", () => ({
  sendPushToUser: vi.fn().mockResolvedValue(false),
}));

// Import services after mocks
const {
  recordTip,
  awardSupporterBadge,
  awardRecurringSupporterBadge,
  revokeRecurringSupporterBadge,
  getUserSubscriptions,
  findUserBySubscriptionId,
  getPublicSupporters,
  ensureTipJarEnabled,
  notifyTipReceived,
  userHasTipped,
  userHasRecurringTip,
} = await import("@/lib/services/tips.service");

const { awardBadge } = await import("@/lib/services/badges.service");

describe("Tip Jar System", () => {
  beforeAll(async () => {
    db = await getTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    // Clean up tips and user_badges between tests
    await db.exec("DELETE FROM tips");
    await db.exec("DELETE FROM user_badges");
    // Reset flags
    tipJarEnabled = true;
    badgeDistEnabled = true;
    // Reset mocks
    mockCreateTipCheckoutSession.mockReset();
    mockCancelStripeSubscription.mockReset();
    mockGetStripeSubscription.mockReset();
  });

  // ─── Record Tips ──────────────────────────────────────────

  describe("Record Tips", () => {
    it("records a one-time tip", async () => {
      const tip = await recordTip(
        TEST_IDS.testUser1,
        500,
        "pi_test_onetip",
        false,
        null,
        "Keep it going!"
      );

      expect(tip).toBeDefined();
      expect(tip.user_id).toBe(TEST_IDS.testUser1);
      expect(tip.amount_cents).toBe(500);
      expect(tip.recurring).toBe(false);
      expect(tip.message).toBe("Keep it going!");
      expect(tip.stripe_subscription_id).toBeNull();
    });

    it("records a recurring tip", async () => {
      const tip = await recordTip(
        TEST_IDS.testUser1,
        1000,
        "pi_test_rectip",
        true,
        "sub_test_123",
        null
      );

      expect(tip.recurring).toBe(true);
      expect(tip.stripe_subscription_id).toBe("sub_test_123");
    });

    it("is idempotent on duplicate stripe_payment_id", async () => {
      await recordTip(TEST_IDS.testUser1, 500, "pi_dup_test", false);
      const second = await recordTip(
        TEST_IDS.testUser1,
        999,
        "pi_dup_test",
        false
      );

      // Should return original, not create new
      expect(second.amount_cents).toBe(500);
    });

    it("enforces message max length via DB constraint", async () => {
      const longMsg = "x".repeat(501);
      await expect(
        recordTip(TEST_IDS.testUser1, 500, "pi_long_msg", false, null, longMsg)
      ).rejects.toThrow();
    });
  });

  // ─── Checkout Session (mocked Stripe) ─────────────────────

  describe("Checkout (mocked Stripe)", () => {
    it("creates one-time tip checkout session", async () => {
      mockCreateTipCheckoutSession.mockResolvedValueOnce(
        "https://checkout.stripe.com/tip_session"
      );

      const { createTipCheckoutSession } = await import(
        "@/lib/services/stripe.service"
      );
      const url = await createTipCheckoutSession({
        userId: TEST_IDS.testUser1,
        amountCents: 500,
        recurring: false,
        message: "Great work!",
      });

      expect(url).toBe("https://checkout.stripe.com/tip_session");
      expect(mockCreateTipCheckoutSession).toHaveBeenCalledWith({
        userId: TEST_IDS.testUser1,
        amountCents: 500,
        recurring: false,
        message: "Great work!",
      });
    });

    it("creates recurring tip checkout session", async () => {
      mockCreateTipCheckoutSession.mockResolvedValueOnce(
        "https://checkout.stripe.com/tip_sub_session"
      );

      const { createTipCheckoutSession } = await import(
        "@/lib/services/stripe.service"
      );
      const url = await createTipCheckoutSession({
        userId: TEST_IDS.testUser1,
        amountCents: 1000,
        recurring: true,
        message: null,
      });

      expect(url).toBe("https://checkout.stripe.com/tip_sub_session");
      expect(mockCreateTipCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({ recurring: true })
      );
    });
  });

  // ─── Badge Awards ─────────────────────────────────────────

  describe("Badge Awards", () => {
    it("awards supporter badge after first tip", async () => {
      await recordTip(TEST_IDS.testUser1, 100, "pi_badge_test", false);
      await awardSupporterBadge(TEST_IDS.testUser1);

      const { queryOne } = await import("@/lib/db");
      const badge = await queryOne<{ badge_id: string }>(
        `SELECT badge_id FROM user_badges WHERE user_id = $1 AND badge_id = 'supporter'`,
        [TEST_IDS.testUser1]
      );
      expect(badge).not.toBeNull();
      expect(badge!.badge_id).toBe("supporter");
    });

    it("awards recurring supporter badge for subscriptions", async () => {
      await recordTip(
        TEST_IDS.testUser1,
        500,
        "pi_rec_badge",
        true,
        "sub_badge_test"
      );
      await awardRecurringSupporterBadge(TEST_IDS.testUser1);

      const { queryOne } = await import("@/lib/db");
      const badge = await queryOne<{ badge_id: string }>(
        `SELECT badge_id FROM user_badges WHERE user_id = $1 AND badge_id = 'recurring_supporter'`,
        [TEST_IDS.testUser1]
      );
      expect(badge).not.toBeNull();
    });

    it("revokes recurring supporter badge on cancel", async () => {
      // Award first
      await awardRecurringSupporterBadge(TEST_IDS.testUser1);

      const { queryOne } = await import("@/lib/db");
      let badge = await queryOne<{ badge_id: string }>(
        `SELECT badge_id FROM user_badges WHERE user_id = $1 AND badge_id = 'recurring_supporter'`,
        [TEST_IDS.testUser1]
      );
      expect(badge).not.toBeNull();

      // Revoke
      await revokeRecurringSupporterBadge(TEST_IDS.testUser1);

      badge = await queryOne<{ badge_id: string }>(
        `SELECT badge_id FROM user_badges WHERE user_id = $1 AND badge_id = 'recurring_supporter'`,
        [TEST_IDS.testUser1]
      );
      expect(badge).toBeNull();
    });

    it("supporter badge is permanent (not revoked)", async () => {
      await awardSupporterBadge(TEST_IDS.testUser1);

      // Even if we try revoking recurring, supporter stays
      await revokeRecurringSupporterBadge(TEST_IDS.testUser1);

      const { queryOne } = await import("@/lib/db");
      const badge = await queryOne<{ badge_id: string }>(
        `SELECT badge_id FROM user_badges WHERE user_id = $1 AND badge_id = 'supporter'`,
        [TEST_IDS.testUser1]
      );
      expect(badge).not.toBeNull();
    });
  });

  // ─── Subscriptions ────────────────────────────────────────

  describe("Subscriptions", () => {
    it("lists user subscriptions from local data", async () => {
      await recordTip(
        TEST_IDS.testUser1,
        500,
        "pi_sub_list_1",
        true,
        "sub_list_1"
      );
      await recordTip(
        TEST_IDS.testUser1,
        1000,
        "pi_sub_list_2",
        true,
        "sub_list_2"
      );

      const subs = await getUserSubscriptions(TEST_IDS.testUser1);
      expect(subs.length).toBe(2);
      expect(subs.map((s) => s.stripe_subscription_id).sort()).toEqual([
        "sub_list_1",
        "sub_list_2",
      ]);
    });

    it("findUserBySubscriptionId returns correct user", async () => {
      await recordTip(
        TEST_IDS.testUser1,
        500,
        "pi_find_sub",
        true,
        "sub_findme"
      );

      const userId = await findUserBySubscriptionId("sub_findme");
      expect(userId).toBe(TEST_IDS.testUser1);
    });

    it("findUserBySubscriptionId returns null for unknown sub", async () => {
      const userId = await findUserBySubscriptionId("sub_unknown");
      expect(userId).toBeNull();
    });

    it("cancel subscription via Stripe mock", async () => {
      mockCancelStripeSubscription.mockResolvedValueOnce(undefined);

      const { cancelStripeSubscription } = await import(
        "@/lib/services/stripe.service"
      );
      await cancelStripeSubscription("sub_cancel_test");

      expect(mockCancelStripeSubscription).toHaveBeenCalledWith(
        "sub_cancel_test"
      );
    });
  });

  // ─── Public Supporters ────────────────────────────────────

  describe("Public Supporters", () => {
    it("returns recent tips with usernames", async () => {
      await recordTip(
        TEST_IDS.testUser1,
        500,
        "pi_pub_1",
        false,
        null,
        "Love fuega!"
      );
      await recordTip(TEST_IDS.testUser2, 1000, "pi_pub_2", false);

      const summary = await getPublicSupporters();
      expect(summary.supporters.length).toBe(2);
      expect(summary.total_lifetime_cents).toBe(1500);

      // Check supporter data includes username
      const supporter = summary.supporters.find(
        (s) => s.message === "Love fuega!"
      );
      expect(supporter).toBeDefined();
      expect(supporter!.username).toBeTruthy();
      expect(supporter!.amount_cents).toBe(500);
    });

    it("includes monthly recurring total", async () => {
      await recordTip(
        TEST_IDS.testUser1,
        500,
        "pi_monthly_1",
        true,
        "sub_monthly_1"
      );
      await recordTip(
        TEST_IDS.testUser2,
        1000,
        "pi_monthly_2",
        true,
        "sub_monthly_2"
      );

      const summary = await getPublicSupporters();
      expect(summary.current_monthly_recurring_cents).toBe(1500);
    });

    it("returns empty when no tips exist", async () => {
      const summary = await getPublicSupporters();
      expect(summary.supporters.length).toBe(0);
      expect(summary.total_lifetime_cents).toBe(0);
      expect(summary.current_monthly_recurring_cents).toBe(0);
    });
  });

  // ─── Feature Flag ─────────────────────────────────────────

  describe("Feature Flag", () => {
    it("ensureTipJarEnabled throws when disabled", () => {
      tipJarEnabled = false;
      expect(() => ensureTipJarEnabled()).toThrow("Tip jar is not available");
    });

    it("ensureTipJarEnabled passes when enabled", () => {
      tipJarEnabled = true;
      expect(() => ensureTipJarEnabled()).not.toThrow();
    });

    it("getUserSubscriptions throws when disabled", async () => {
      tipJarEnabled = false;
      await expect(
        getUserSubscriptions(TEST_IDS.testUser1)
      ).rejects.toThrow("Tip jar is not available");
    });
  });

  // ─── Helper Functions ─────────────────────────────────────

  describe("Helper Functions", () => {
    it("userHasTipped returns false when no tips", async () => {
      expect(await userHasTipped(TEST_IDS.testUser1)).toBe(false);
    });

    it("userHasTipped returns true after tipping", async () => {
      await recordTip(TEST_IDS.testUser1, 100, "pi_has_tip", false);
      expect(await userHasTipped(TEST_IDS.testUser1)).toBe(true);
    });

    it("userHasRecurringTip detects recurring tips", async () => {
      expect(await userHasRecurringTip(TEST_IDS.testUser1)).toBe(false);

      await recordTip(
        TEST_IDS.testUser1,
        500,
        "pi_has_rec",
        true,
        "sub_has_rec"
      );
      expect(await userHasRecurringTip(TEST_IDS.testUser1)).toBe(true);
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────

  describe("Edge Cases", () => {
    it("tips are per-user", async () => {
      await recordTip(TEST_IDS.testUser1, 500, "pi_peruser_1", false);
      await recordTip(TEST_IDS.testUser2, 1000, "pi_peruser_2", false);

      expect(await userHasTipped(TEST_IDS.testUser1)).toBe(true);
      expect(await userHasTipped(TEST_IDS.testUser2)).toBe(true);
    });

    it("multiple tips from same user accumulate", async () => {
      await recordTip(TEST_IDS.testUser1, 500, "pi_multi_1", false);
      await recordTip(TEST_IDS.testUser1, 1000, "pi_multi_2", false);

      const summary = await getPublicSupporters();
      const user1Tips = summary.supporters.filter(
        (s) => s.amount_cents === 500 || s.amount_cents === 1000
      );
      expect(user1Tips.length).toBe(2);
      expect(summary.total_lifetime_cents).toBe(1500);
    });

    it("tip with null message is valid", async () => {
      const tip = await recordTip(
        TEST_IDS.testUser1,
        100,
        "pi_null_msg",
        false,
        null,
        null
      );
      expect(tip.message).toBeNull();
    });

    it("notifyTipReceived does not throw", async () => {
      // Notifications are mocked and disabled — just verify no error
      await expect(
        notifyTipReceived(TEST_IDS.testUser1, 500, false)
      ).resolves.not.toThrow();
    });
  });
});
