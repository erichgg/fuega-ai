/**
 * Tests for the referral system:
 * - Generate referral link
 * - Track referral via cookie on signup
 * - Self-referral silently ignored
 * - Same IP silently ignored
 * - Referral count increments
 * - Badge awarded at threshold
 * - Reversion on banned referee
 * - Account age check (referrer must be >= 24hrs old)
 * - Rate limit check (max 10 per hour per referrer)
 * - Duplicate referee check
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
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

// Mock push notifications
vi.mock("@/lib/services/push-notifications", () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocks
// Lazy-loaded to avoid top-level await
type ReferralService = typeof import("@/lib/services/referrals.service");
let getReferralLink: ReferralService["getReferralLink"];
let getReferralStats: ReferralService["getReferralStats"];
let getReferralHistory: ReferralService["getReferralHistory"];
let processReferral: ReferralService["processReferral"];
let revertBannedReferrals: ReferralService["revertBannedReferrals"];

// Helper: create a test user with a specific created_at
async function createTestUser(
  id: string,
  username: string,
  opts: { referralCode?: string; ipHash?: string; createdAt?: string } = {}
): Promise<void> {
  const d = await getTestDb();
  const createdAt = opts.createdAt ?? new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48 hrs ago by default
  await d.query(
    `INSERT INTO users (id, username, password_hash, ip_address_hash, referral_code, created_at)
     VALUES ($1, $2, 'hash', $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET
       referral_code = COALESCE(EXCLUDED.referral_code, users.referral_code),
       ip_address_hash = COALESCE(EXCLUDED.ip_address_hash, users.ip_address_hash)`,
    [id, username, opts.ipHash ?? "iphash_" + id.slice(0, 8), opts.referralCode ?? null, createdAt]
  );
}

// Helper UUIDs for test users
const REFERRER_ID = "a0000000-0000-0000-0000-000000000001";
const REFEREE_ID = "a0000000-0000-0000-0000-000000000002";
const REFEREE2_ID = "a0000000-0000-0000-0000-000000000003";

describe("Referral System", () => {
  beforeAll(async () => {
    db = await getTestDb();
    const refSvc = await import("@/lib/services/referrals.service");
    getReferralLink = refSvc.getReferralLink;
    getReferralStats = refSvc.getReferralStats;
    getReferralHistory = refSvc.getReferralHistory;
    processReferral = refSvc.processReferral;
    revertBannedReferrals = refSvc.revertBannedReferrals;
    // Create test users
    await createTestUser(REFERRER_ID, "referrer_user", {
      referralCode: "abc12345",
      ipHash: "referrer_ip_hash",
    });
    await createTestUser(REFEREE_ID, "referee_user", {
      ipHash: "referee_ip_hash",
    });
    await createTestUser(REFEREE2_ID, "referee_user2", {
      ipHash: "referee2_ip_hash",
    });
  });

  afterAll(async () => {
    // Clean up test users
    const d = await getTestDb();
    await d.query(`DELETE FROM referrals WHERE referrer_id = $1`, [REFERRER_ID]);
    await d.query(`DELETE FROM users WHERE id IN ($1, $2, $3)`, [REFERRER_ID, REFEREE_ID, REFEREE2_ID]);
    await closeTestDb();
  });

  describe("getReferralLink", () => {
    it("returns existing referral link when user has a code", async () => {
      const result = await getReferralLink(REFERRER_ID);
      expect(result.referral_link).toContain("/join?ref=abc12345");
    });

    it("generates a new referral code when user has none", async () => {
      const result2 = await getReferralLink(REFEREE_ID);
      expect(result2.referral_link).toContain("/join?ref=");
      // Should be 8 hex chars
      const code = result2.referral_link.split("ref=")[1];
      expect(code).toMatch(/^[a-f0-9]{8}$/);
    });

    it("throws for non-existent user", async () => {
      await expect(
        getReferralLink("99999999-9999-9999-9999-999999999999")
      ).rejects.toThrow("User not found");
    });
  });

  describe("getReferralStats", () => {
    it("returns stats with zero referrals", async () => {
      const stats = await getReferralStats(REFERRER_ID);
      expect(stats.referral_count).toBe(0);
      expect(stats.next_badge_at).toBe(1);
      expect(stats.next_badge_name).toBe("Spark Spreader");
      expect(stats.current_badge).toBeNull();
    });
  });

  describe("processReferral", () => {
    it("processes a valid referral", async () => {
      const result = await processReferral({
        referralCode: "abc12345",
        newUserId: REFEREE_ID,
        newUserIpHash: "referee_ip_hash",
      });
      expect(result.processed).toBe(true);
      expect(result.reason).toBe("success");

      // Verify referral was recorded
      const d = await getTestDb();
      const referral = await d.query(
        `SELECT * FROM referrals WHERE referrer_id = $1 AND referee_id = $2`,
        [REFERRER_ID, REFEREE_ID]
      );
      expect(referral.rows.length).toBe(1);
      expect((referral.rows[0] as Record<string, unknown>).reverted).toBe(false);
    });

    it("increments referral count", async () => {
      const stats = await getReferralStats(REFERRER_ID);
      expect(stats.referral_count).toBe(1);
      expect(stats.current_badge).toBe("Spark Spreader");
    });

    it("silently ignores self-referral", async () => {
      const result = await processReferral({
        referralCode: "abc12345",
        newUserId: REFERRER_ID,
        newUserIpHash: "different_ip",
      });
      expect(result.processed).toBe(false);
      expect(result.reason).toBe("self_referral");
    });

    it("silently ignores same IP", async () => {
      const result = await processReferral({
        referralCode: "abc12345",
        newUserId: REFEREE2_ID,
        newUserIpHash: "referrer_ip_hash", // Same IP as referrer
      });
      expect(result.processed).toBe(false);
      expect(result.reason).toBe("same_ip");
    });

    it("silently ignores invalid referral code", async () => {
      const result = await processReferral({
        referralCode: "nonexist",
        newUserId: REFEREE2_ID,
        newUserIpHash: "referee2_ip_hash",
      });
      expect(result.processed).toBe(false);
      expect(result.reason).toBe("invalid_code");
    });

    it("silently ignores duplicate referee", async () => {
      // REFEREE_ID was already referred above
      const result = await processReferral({
        referralCode: "abc12345",
        newUserId: REFEREE_ID,
        newUserIpHash: "referee_ip_hash",
      });
      expect(result.processed).toBe(false);
      expect(result.reason).toBe("already_referred");
    });

    it("silently ignores referrer with account < 24 hours old", async () => {
      const newReferrerId = "a0000000-0000-0000-0000-000000000010";
      const newRefereeId = "a0000000-0000-0000-0000-000000000011";
      const d = await getTestDb();

      // Create a very new referrer
      await createTestUser(newReferrerId, "new_referrer", {
        referralCode: "newcode1",
        ipHash: "new_referrer_ip",
        createdAt: new Date().toISOString(), // Just now
      });
      await createTestUser(newRefereeId, "new_referee", {
        ipHash: "new_referee_ip",
      });

      const result = await processReferral({
        referralCode: "newcode1",
        newUserId: newRefereeId,
        newUserIpHash: "new_referee_ip",
      });
      expect(result.processed).toBe(false);
      expect(result.reason).toBe("account_too_new");

      // Cleanup
      await d.query(`DELETE FROM users WHERE id IN ($1, $2)`, [newReferrerId, newRefereeId]);
    });
  });

  describe("getReferralHistory", () => {
    it("returns list of referred users", async () => {
      const history = await getReferralHistory(REFERRER_ID);
      expect(history.length).toBe(1);
      expect(history[0]?.referee_username).toBe("referee_user");
      expect(history[0]?.status).toBe("active");
    });
  });

  describe("revertBannedReferrals", () => {
    it("reverts referrals for banned users within 7 days", async () => {
      const d = await getTestDb();

      // Soft-delete the referee (simulate ban)
      await d.query(
        `UPDATE users SET deleted_at = NOW() WHERE id = $1`,
        [REFEREE_ID]
      );

      const reverted = await revertBannedReferrals();
      expect(reverted).toBeGreaterThanOrEqual(1);

      // Verify referral is marked reverted
      const referral = await d.query(
        `SELECT reverted FROM referrals WHERE referrer_id = $1 AND referee_id = $2`,
        [REFERRER_ID, REFEREE_ID]
      );
      expect((referral.rows[0] as Record<string, unknown>).reverted).toBe(true);

      // Verify count was decremented
      const stats = await getReferralStats(REFERRER_ID);
      expect(stats.referral_count).toBe(0);

      // Cleanup: restore the user
      await d.query(
        `UPDATE users SET deleted_at = NULL WHERE id = $1`,
        [REFEREE_ID]
      );
    });
  });
});
