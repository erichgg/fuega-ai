/**
 * Tests for the badge system:
 * - List all badges (40 returned)
 * - Get single badge with user percentage
 * - Award first_post badge after creating a post
 * - Award founder badge to early user
 * - Set primary badge
 * - Fail to set unowned badge as primary
 * - ENABLE_BADGE_DISTRIBUTION=false skips award
 * - Idempotency (awarding same badge twice = no error, no duplicate)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { getTestDb, closeTestDb, TEST_IDS } from "@/tests/unit/database/helpers";
import type { PGlite } from "@electric-sql/pglite";

// Mock the db module to use PGlite
let db: PGlite;

// We'll mock the db module and feature flags at module level
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

// Start with badge distribution enabled
let badgeDistributionEnabled = true;
let notificationsEnabled = false;

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: (flag: string) => {
    if (flag === "ENABLE_BADGE_DISTRIBUTION") return badgeDistributionEnabled;
    if (flag === "ENABLE_NOTIFICATIONS") return notificationsEnabled;
    return false;
  },
  getAllFeatureFlags: () => ({
    ENABLE_BADGE_DISTRIBUTION: badgeDistributionEnabled,
    ENABLE_COSMETICS_SHOP: false,
    ENABLE_TIP_JAR: false,
    ENABLE_NOTIFICATIONS: notificationsEnabled,
  }),
}));

// Import after mocks
const { listAllBadges, getBadgeById, getUserBadges, setPrimaryBadge, awardBadge } = await import(
  "@/lib/services/badges.service"
);
const { checkAllBadges, checkBadgesAfterPost } = await import(
  "@/lib/services/badge-eligibility"
);

describe("Badge System", () => {
  beforeAll(async () => {
    db = await getTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    // Clean up test badge awards between tests
    await db.exec("DELETE FROM user_badges WHERE user_id != '00000000-0000-0000-0000-000000000001'");
    await db.exec("DELETE FROM notifications WHERE type = 'badge_earned'");
    // Reset flags
    badgeDistributionEnabled = true;
    notificationsEnabled = false;
  });

  // ─── List all badges ─────────────────────────────────────────

  describe("listAllBadges", () => {
    it("returns all 40 badge definitions", async () => {
      const badges = await listAllBadges();

      expect(badges.length).toBe(40);

      // Verify all categories are present
      const categories = new Set(badges.map((b) => b.category));
      expect(categories).toEqual(
        new Set(["founder", "engagement", "contribution", "governance", "referral", "special"])
      );
    });

    it("returns badges sorted by category and sort_order", async () => {
      const badges = await listAllBadges();

      // Within the same category, sort_order should be ascending
      let lastCategory = "";
      let lastOrder = -1;

      for (const badge of badges) {
        if (badge.category !== lastCategory) {
          lastCategory = badge.category;
          lastOrder = -1;
        }
        expect(badge.sort_order).toBeGreaterThan(lastOrder);
        lastOrder = badge.sort_order;
      }
    });

    it("each badge has required fields", async () => {
      const badges = await listAllBadges();

      for (const badge of badges) {
        expect(badge.badge_id).toBeTruthy();
        expect(badge.name).toBeTruthy();
        expect(badge.description).toBeTruthy();
        expect(badge.category).toBeTruthy();
        expect(badge.rarity).toBeTruthy();
        expect(badge.earn_criteria).toBeTruthy();
        expect(badge.is_active).toBe(true);
      }
    });
  });

  // ─── Get single badge with stats ─────────────────────────────

  describe("getBadgeById", () => {
    it("returns badge with user percentage", async () => {
      const badge = await getBadgeById("v1_founder");

      expect(badge).not.toBeNull();
      expect(badge!.badge_id).toBe("v1_founder");
      expect(badge!.name).toBe("V1 Founder");
      expect(badge!.rarity).toBe("legendary");
      expect(badge!.category).toBe("founder");
      expect(typeof badge!.earned_count).toBe("number");
      expect(typeof badge!.total_users).toBe("number");
      expect(typeof badge!.earned_percentage).toBe("number");
      expect(badge!.earned_percentage).toBeGreaterThanOrEqual(0);
      expect(badge!.earned_percentage).toBeLessThanOrEqual(100);
    });

    it("returns null for non-existent badge", async () => {
      const badge = await getBadgeById("nonexistent_badge_xyz");
      expect(badge).toBeNull();
    });

    it("calculates earned_percentage correctly", async () => {
      // Award badge to testUser1
      await awardBadge(TEST_IDS.testUser1, "first_post");

      const badge = await getBadgeById("first_post");
      expect(badge).not.toBeNull();
      expect(badge!.earned_count).toBe(1);
      expect(badge!.earned_percentage).toBeGreaterThan(0);
    });
  });

  // ─── Award badge ─────────────────────────────────────────────

  describe("awardBadge", () => {
    it("awards first_post badge successfully", async () => {
      const result = await awardBadge(TEST_IDS.testUser1, "first_post");

      expect(result.awarded).toBe(true);
      expect(result.reason).toBe("awarded");
      expect(result.badge_id).toBe("first_post");

      // Verify it's in the database
      const badges = await getUserBadges(TEST_IDS.testUser1);
      const firstPost = badges.find((b) => b.badge_id === "first_post");
      expect(firstPost).toBeDefined();
      expect(firstPost!.earned_at).toBeTruthy();
    });

    it("awards founder badge with metadata", async () => {
      // Set founder_number on testUser1 (renamed from founder_badge_number in migration 010)
      await db.query(
        "UPDATE users SET founder_number = 42 WHERE id = $1",
        [TEST_IDS.testUser1]
      );

      const result = await awardBadge(TEST_IDS.testUser1, "v1_founder", {
        founder_number: 42,
      });

      expect(result.awarded).toBe(true);
      expect(result.reason).toBe("awarded");

      const badges = await getUserBadges(TEST_IDS.testUser1);
      const founder = badges.find((b) => b.badge_id === "v1_founder");
      expect(founder).toBeDefined();
      expect(founder!.metadata).toEqual({ founder_number: 42 });

      // Clean up
      await db.query(
        "UPDATE users SET founder_number = NULL WHERE id = $1",
        [TEST_IDS.testUser1]
      );
    });

    it("returns badge_not_found for invalid badge ID", async () => {
      const result = await awardBadge(TEST_IDS.testUser1, "totally_fake_badge");

      expect(result.awarded).toBe(false);
      expect(result.reason).toBe("badge_not_found");
    });
  });

  // ─── Set primary badge ───────────────────────────────────────

  describe("setPrimaryBadge", () => {
    it("sets primary badge when user owns it", async () => {
      // First award the badge
      await awardBadge(TEST_IDS.testUser1, "first_post");

      // Then set it as primary
      await setPrimaryBadge(TEST_IDS.testUser1, "first_post");

      // Verify it was set
      const result = await db.query<{ primary_badge: string }>(
        "SELECT primary_badge FROM users WHERE id = $1",
        [TEST_IDS.testUser1]
      );
      expect(result.rows[0].primary_badge).toBe("first_post");

      // Clean up
      await db.query(
        "UPDATE users SET primary_badge = NULL WHERE id = $1",
        [TEST_IDS.testUser1]
      );
    });

    it("fails to set unowned badge as primary", async () => {
      await expect(
        setPrimaryBadge(TEST_IDS.testUser1, "v1_founder")
      ).rejects.toThrow("You do not own this badge");
    });
  });

  // ─── Feature flag: ENABLE_BADGE_DISTRIBUTION=false ───────────

  describe("feature flag: ENABLE_BADGE_DISTRIBUTION=false", () => {
    it("skips award when flag is disabled", async () => {
      badgeDistributionEnabled = false;

      const result = await awardBadge(TEST_IDS.testUser1, "first_post");

      expect(result.awarded).toBe(false);
      expect(result.reason).toBe("flag_disabled");

      // Verify badge was NOT inserted
      const badges = await getUserBadges(TEST_IDS.testUser1);
      expect(badges.length).toBe(0);
    });

    it("logs eligibility but does not award", async () => {
      badgeDistributionEnabled = false;
      const consoleSpy = vi.spyOn(console, "log");

      await awardBadge(TEST_IDS.testUser1, "first_comment");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("ENABLE_BADGE_DISTRIBUTION=false")
      );
      consoleSpy.mockRestore();
    });
  });

  // ─── Idempotency ─────────────────────────────────────────────

  describe("idempotency", () => {
    it("awarding same badge twice results in no error and no duplicate", async () => {
      // Award first time
      const result1 = await awardBadge(TEST_IDS.testUser1, "first_post");
      expect(result1.awarded).toBe(true);
      expect(result1.reason).toBe("awarded");

      // Award second time
      const result2 = await awardBadge(TEST_IDS.testUser1, "first_post");
      expect(result2.awarded).toBe(false);
      expect(result2.reason).toBe("already_owned");

      // Verify only one badge in DB
      const badges = await getUserBadges(TEST_IDS.testUser1);
      const firstPostBadges = badges.filter((b) => b.badge_id === "first_post");
      expect(firstPostBadges.length).toBe(1);
    });
  });

  // ─── Get user badges ─────────────────────────────────────────

  describe("getUserBadges", () => {
    it("returns badges sorted by rarity (legendary first)", async () => {
      // Award multiple badges of different rarities
      await awardBadge(TEST_IDS.testUser1, "first_post"); // common
      await awardBadge(TEST_IDS.testUser1, "first_comment"); // common
      await awardBadge(TEST_IDS.testUser1, "prolific_poster"); // uncommon

      // Set founder badge to allow legendary award
      await db.query(
        "UPDATE users SET founder_number = 1 WHERE id = $1",
        [TEST_IDS.testUser1]
      );
      await awardBadge(TEST_IDS.testUser1, "v1_founder", { founder_number: 1 });

      const badges = await getUserBadges(TEST_IDS.testUser1);
      expect(badges.length).toBe(4);

      // Legendary should come first
      expect(badges[0].rarity).toBe("legendary");
      expect(badges[0].badge_id).toBe("v1_founder");

      // Clean up
      await db.query(
        "UPDATE users SET founder_number = NULL WHERE id = $1",
        [TEST_IDS.testUser1]
      );
    });

    it("returns empty array for user with no badges", async () => {
      const badges = await getUserBadges(TEST_IDS.testUser2);
      expect(badges.length).toBe(0);
    });

    it("throws error for non-existent user", async () => {
      await expect(
        getUserBadges("99999999-9999-9999-9999-999999999999")
      ).rejects.toThrow("User not found");
    });

    it("includes metadata on badge awards", async () => {
      await awardBadge(TEST_IDS.testUser1, "first_post", {
        trigger: "post_creation",
      });

      const badges = await getUserBadges(TEST_IDS.testUser1);
      const firstPost = badges.find((b) => b.badge_id === "first_post");
      expect(firstPost).toBeDefined();
      expect(firstPost!.metadata).toEqual({ trigger: "post_creation" });
    });
  });

  // ─── Notifications ───────────────────────────────────────────

  describe("notifications", () => {
    it("sends badge_earned notification when ENABLE_NOTIFICATIONS=true", async () => {
      notificationsEnabled = true;

      await awardBadge(TEST_IDS.testUser1, "first_post");

      const result = await db.query<{ type: string; title: string }>(
        "SELECT type, title FROM notifications WHERE user_id = $1 AND type = 'badge_earned'",
        [TEST_IDS.testUser1]
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].title).toContain("First Flame");
    });

    it("does NOT send notification when ENABLE_NOTIFICATIONS=false", async () => {
      notificationsEnabled = false;

      await awardBadge(TEST_IDS.testUser1, "first_post");

      const result = await db.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND type = 'badge_earned'",
        [TEST_IDS.testUser1]
      );
      expect(parseInt(result.rows[0].count, 10)).toBe(0);
    });
  });

  // ─── Validation ──────────────────────────────────────────────

  describe("validation", () => {
    it("validates badge_id format in setPrimaryBadgeSchema", async () => {
      const { setPrimaryBadgeSchema } = await import("@/lib/validation/badges");

      const valid = setPrimaryBadgeSchema.safeParse({ badge_id: "v1_founder" });
      expect(valid.success).toBe(true);

      const invalid = setPrimaryBadgeSchema.safeParse({ badge_id: "" });
      expect(invalid.success).toBe(false);

      const invalidChars = setPrimaryBadgeSchema.safeParse({ badge_id: "UPPER_CASE" });
      expect(invalidChars.success).toBe(false);
    });
  });

  // ─── Feature flags module ────────────────────────────────────

  describe("feature flags module", () => {
    it("isFeatureEnabled returns correct values", async () => {
      const { isFeatureEnabled } = await import("@/lib/feature-flags");

      badgeDistributionEnabled = true;
      expect(isFeatureEnabled("ENABLE_BADGE_DISTRIBUTION")).toBe(true);

      badgeDistributionEnabled = false;
      expect(isFeatureEnabled("ENABLE_BADGE_DISTRIBUTION")).toBe(false);
    });
  });
});
