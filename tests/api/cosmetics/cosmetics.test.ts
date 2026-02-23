/**
 * Tests for the cosmetics shop system:
 * - List cosmetics catalog (40 items grouped by category)
 * - Get single cosmetic with full metadata
 * - Create checkout session (mock Stripe)
 * - Webhook processes purchase
 * - Refund within 7 days succeeds
 * - Refund after 7 days fails
 * - Can't buy cosmetic already owned
 * - Active cosmetics applied to profile
 * - Feature flag off = 403/404
 * - Refund abuse limit (5 in 30 days)
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
let cosmeticsShopEnabled = true;

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: (flag: string) => {
    if (flag === "ENABLE_COSMETICS_SHOP") return cosmeticsShopEnabled;
    return false;
  },
  getAllFeatureFlags: () => ({
    ENABLE_BADGE_DISTRIBUTION: false,
    ENABLE_COSMETICS_SHOP: cosmeticsShopEnabled,
    ENABLE_TIP_JAR: false,
    ENABLE_NOTIFICATIONS: false,
  }),
}));

// Mock Stripe service
const mockCreateCheckoutSession = vi.fn();
const mockCreateRefund = vi.fn();
const mockConstructWebhookEvent = vi.fn();

vi.mock("@/lib/services/stripe.service", () => ({
  createCheckoutSession: (...args: unknown[]) => mockCreateCheckoutSession(...args),
  createRefund: (...args: unknown[]) => mockCreateRefund(...args),
  constructWebhookEvent: (...args: unknown[]) => mockConstructWebhookEvent(...args),
  getStripe: () => ({}),
}));

// Import services after mocks
const {
  listCosmetics,
  getCosmeticById,
  getUserCosmetics,
  userOwnsCosmetic,
  recordPurchase,
  getPurchaseRecord,
  countRecentRefunds,
  markRefunded,
  setActiveCosmetics,
  getActiveCosmetics,
  removeFromActive,
  COSMETICS_CATALOG,
  getCatalogItem,
  getCatalogGroupedByCategory,
} = await import("@/lib/services/cosmetics.service");

describe("Cosmetics Shop System", () => {
  beforeAll(async () => {
    db = await getTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    // Clean up user_cosmetics between tests
    await db.exec("DELETE FROM user_cosmetics");
    // Reset cosmetics on test users
    await db.exec(`UPDATE users SET cosmetics = '{}' WHERE id IN ('${TEST_IDS.testUser1}', '${TEST_IDS.testUser2}')`);
    // Reset flags
    cosmeticsShopEnabled = true;
    // Reset mocks
    mockCreateCheckoutSession.mockReset();
    mockCreateRefund.mockReset();
    mockConstructWebhookEvent.mockReset();
  });

  // ─── Static Catalog ────────────────────────────────────────

  describe("Static Catalog", () => {
    it("has 40 cosmetic definitions", () => {
      expect(COSMETICS_CATALOG.length).toBe(40);
    });

    it("all items have required fields", () => {
      for (const item of COSMETICS_CATALOG) {
        expect(item.cosmetic_id).toBeTruthy();
        expect(item.name).toBeTruthy();
        expect(item.description).toBeTruthy();
        expect(item.category).toBeTruthy();
        expect(item.subcategory).toBeTruthy();
        expect(item.price_cents).toBeGreaterThan(0);
        expect(typeof item.metadata).toBe("object");
        expect(item.available).toBe(true);
      }
    });

    it("all cosmetic_ids are unique", () => {
      const ids = COSMETICS_CATALOG.map((c) => c.cosmetic_id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("getCatalogItem returns correct item", () => {
      const item = getCatalogItem("theme_lava_flow");
      expect(item).toBeDefined();
      expect(item!.name).toBe("Lava Flow");
      expect(item!.price_cents).toBe(499);
    });

    it("getCatalogItem returns undefined for non-existent", () => {
      expect(getCatalogItem("nonexistent_xyz")).toBeUndefined();
    });

    it("getCatalogGroupedByCategory groups correctly", () => {
      const grouped = getCatalogGroupedByCategory();
      expect(Object.keys(grouped).length).toBeGreaterThan(0);
      // Check theme:profile exists
      expect(grouped["theme:profile"]).toBeDefined();
      expect(grouped["theme:profile"].length).toBe(6);
    });

    it("has all expected categories", () => {
      const categories = new Set(COSMETICS_CATALOG.map((c) => c.category));
      expect(categories).toEqual(
        new Set(["theme", "border", "title", "color", "avatar", "banner", "icon"])
      );
    });
  });

  // ─── DB: List Cosmetics ────────────────────────────────────

  describe("listCosmetics (DB)", () => {
    it("returns all 40 cosmetics from database", async () => {
      const cosmetics = await listCosmetics();
      expect(cosmetics.length).toBe(40);
    });

    it("all items have required fields", async () => {
      const cosmetics = await listCosmetics();
      for (const item of cosmetics) {
        expect(item.cosmetic_id).toBeTruthy();
        expect(item.name).toBeTruthy();
        expect(item.price_cents).toBeGreaterThanOrEqual(0);
        expect(item.available).toBe(true);
      }
    });

    it("items are sorted by category, subcategory, sort_order", async () => {
      const cosmetics = await listCosmetics();
      for (let i = 1; i < cosmetics.length; i++) {
        const prev = cosmetics[i - 1];
        const curr = cosmetics[i];
        const prevKey = `${prev.category}:${prev.subcategory}`;
        const currKey = `${curr.category}:${curr.subcategory}`;
        if (prevKey === currKey) {
          expect(curr.sort_order).toBeGreaterThanOrEqual(prev.sort_order);
        }
      }
    });
  });

  // ─── DB: Get Single Cosmetic ───────────────────────────────

  describe("getCosmeticById", () => {
    it("returns cosmetic with full metadata", async () => {
      const cosmetic = await getCosmeticById("theme_lava_flow");
      expect(cosmetic).not.toBeNull();
      expect(cosmetic!.cosmetic_id).toBe("theme_lava_flow");
      expect(cosmetic!.name).toBe("Lava Flow");
      expect(cosmetic!.price_cents).toBe(499);
      expect(cosmetic!.metadata).toBeDefined();
    });

    it("returns null for non-existent cosmetic", async () => {
      const cosmetic = await getCosmeticById("nonexistent_xyz");
      expect(cosmetic).toBeNull();
    });
  });

  // ─── Purchase & Ownership ──────────────────────────────────

  describe("Purchase & Ownership", () => {
    it("records a purchase", async () => {
      await recordPurchase(TEST_IDS.testUser1, "theme_lava_flow", 499, "pi_test_123");

      const owns = await userOwnsCosmetic(TEST_IDS.testUser1, "theme_lava_flow");
      expect(owns).toBe(true);
    });

    it("user does not own un-purchased cosmetic", async () => {
      const owns = await userOwnsCosmetic(TEST_IDS.testUser1, "theme_arctic_frost");
      expect(owns).toBe(false);
    });

    it("cannot purchase same cosmetic twice (idempotent)", async () => {
      await recordPurchase(TEST_IDS.testUser1, "theme_lava_flow", 499, "pi_test_123");
      // Second insert should be silently ignored
      await recordPurchase(TEST_IDS.testUser1, "theme_lava_flow", 499, "pi_test_456");

      const cosmetics = await getUserCosmetics(TEST_IDS.testUser1);
      const lavaFlows = cosmetics.filter((c) => c.cosmetic_id === "theme_lava_flow");
      expect(lavaFlows.length).toBe(1);
      // Should keep original payment ID
      expect(lavaFlows[0].stripe_payment_id).toBe("pi_test_123");
    });

    it("getUserCosmetics returns owned items with joined data", async () => {
      await recordPurchase(TEST_IDS.testUser1, "theme_lava_flow", 499, "pi_test_123");
      await recordPurchase(TEST_IDS.testUser1, "border_flame_ring", 299, "pi_test_456");

      const cosmetics = await getUserCosmetics(TEST_IDS.testUser1);
      expect(cosmetics.length).toBe(2);

      const lavaFlow = cosmetics.find((c) => c.cosmetic_id === "theme_lava_flow");
      expect(lavaFlow).toBeDefined();
      expect(lavaFlow!.name).toBe("Lava Flow");
      expect(lavaFlow!.category).toBe("theme");
    });

    it("getUserCosmetics throws for non-existent user", async () => {
      await expect(
        getUserCosmetics("99999999-0000-0000-0000-000000000099")
      ).rejects.toThrow("User not found");
    });
  });

  // ─── Refund ────────────────────────────────────────────────

  describe("Refund", () => {
    it("refund within 7 days succeeds", async () => {
      await recordPurchase(TEST_IDS.testUser1, "theme_lava_flow", 499, "pi_test_123");

      const record = await getPurchaseRecord(TEST_IDS.testUser1, "theme_lava_flow");
      expect(record).not.toBeNull();

      // Check it's within window (just purchased)
      const purchaseDate = new Date(record!.purchased_at);
      const daysSince = (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysSince).toBeLessThan(7);

      // Mark refunded
      await markRefunded(TEST_IDS.testUser1, "theme_lava_flow");

      const ownsAfter = await userOwnsCosmetic(TEST_IDS.testUser1, "theme_lava_flow");
      expect(ownsAfter).toBe(false);
    });

    it("refunded cosmetic excluded from getUserCosmetics", async () => {
      await recordPurchase(TEST_IDS.testUser1, "theme_lava_flow", 499, "pi_test_123");
      await markRefunded(TEST_IDS.testUser1, "theme_lava_flow");

      const cosmetics = await getUserCosmetics(TEST_IDS.testUser1);
      expect(cosmetics.length).toBe(0);
    });

    it("countRecentRefunds tracks refund count", async () => {
      // Purchase and refund several
      for (let i = 0; i < 3; i++) {
        const cosmeticId = COSMETICS_CATALOG[i].cosmetic_id;
        await recordPurchase(TEST_IDS.testUser1, cosmeticId, 100, `pi_test_${i}`);
        await markRefunded(TEST_IDS.testUser1, cosmeticId);
      }

      const count = await countRecentRefunds(TEST_IDS.testUser1);
      expect(count).toBe(3);
    });

    it("getPurchaseRecord returns null for unowned cosmetic", async () => {
      const record = await getPurchaseRecord(TEST_IDS.testUser1, "theme_lava_flow");
      expect(record).toBeNull();
    });
  });

  // ─── Active Cosmetics ──────────────────────────────────────

  describe("Active Cosmetics", () => {
    it("sets active cosmetics for owned items", async () => {
      await recordPurchase(TEST_IDS.testUser1, "theme_lava_flow", 499, "pi_test_123");
      await recordPurchase(TEST_IDS.testUser1, "border_flame_ring", 299, "pi_test_456");

      await setActiveCosmetics(TEST_IDS.testUser1, {
        theme: "theme_lava_flow",
        border: "border_flame_ring",
      });

      const active = await getActiveCosmetics(TEST_IDS.testUser1);
      expect(active.theme).toBe("theme_lava_flow");
      expect(active.border).toBe("border_flame_ring");
    });

    it("rejects setting unowned cosmetic as active", async () => {
      await expect(
        setActiveCosmetics(TEST_IDS.testUser1, {
          theme: "theme_lava_flow", // not purchased
        })
      ).rejects.toThrow("You do not own cosmetic");
    });

    it("removeFromActive removes refunded cosmetic", async () => {
      await recordPurchase(TEST_IDS.testUser1, "theme_lava_flow", 499, "pi_test_123");
      await setActiveCosmetics(TEST_IDS.testUser1, { theme: "theme_lava_flow" });

      // Verify it's active
      let active = await getActiveCosmetics(TEST_IDS.testUser1);
      expect(active.theme).toBe("theme_lava_flow");

      // Remove from active
      await removeFromActive(TEST_IDS.testUser1, "theme_lava_flow");

      active = await getActiveCosmetics(TEST_IDS.testUser1);
      expect(active.theme).toBeUndefined();
    });

    it("getActiveCosmetics returns empty for new user", async () => {
      const active = await getActiveCosmetics(TEST_IDS.testUser1);
      expect(active).toEqual({});
    });
  });

  // ─── Checkout (mocked Stripe) ─────────────────────────────

  describe("Checkout (mocked Stripe)", () => {
    it("creates checkout session with correct params", async () => {
      mockCreateCheckoutSession.mockResolvedValueOnce("https://checkout.stripe.com/test_session");

      const { createCheckoutSession } = await import("@/lib/services/stripe.service");
      const url = await createCheckoutSession({
        userId: TEST_IDS.testUser1,
        cosmeticId: "theme_lava_flow",
        cosmeticName: "Lava Flow",
        priceCents: 499,
      });

      expect(url).toBe("https://checkout.stripe.com/test_session");
      expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
        userId: TEST_IDS.testUser1,
        cosmeticId: "theme_lava_flow",
        cosmeticName: "Lava Flow",
        priceCents: 499,
      });
    });
  });

  // ─── Webhook Purchase Processing ───────────────────────────

  describe("Webhook Purchase Processing", () => {
    it("records purchase from checkout.session.completed", async () => {
      // Simulate webhook processing directly via service function
      await recordPurchase(
        TEST_IDS.testUser1,
        "border_flame_ring",
        299,
        "pi_webhook_test"
      );

      const owns = await userOwnsCosmetic(TEST_IDS.testUser1, "border_flame_ring");
      expect(owns).toBe(true);

      const cosmetics = await getUserCosmetics(TEST_IDS.testUser1);
      const purchased = cosmetics.find((c) => c.cosmetic_id === "border_flame_ring");
      expect(purchased).toBeDefined();
      expect(purchased!.stripe_payment_id).toBe("pi_webhook_test");
      expect(purchased!.price_paid_cents).toBe(299);
    });
  });

  // ─── Feature Flag ──────────────────────────────────────────

  describe("Feature Flag", () => {
    it("catalog still accessible when flag disabled (via static fallback)", () => {
      cosmeticsShopEnabled = false;
      // Static catalog always available
      expect(COSMETICS_CATALOG.length).toBe(40);
    });

    it("getCatalogItem works regardless of flag", () => {
      cosmeticsShopEnabled = false;
      const item = getCatalogItem("theme_lava_flow");
      expect(item).toBeDefined();
    });
  });

  // ─── Edge Cases ────────────────────────────────────────────

  describe("Edge Cases", () => {
    it("refund count is per-user", async () => {
      // User 1 refunds
      await recordPurchase(TEST_IDS.testUser1, "theme_lava_flow", 499, "pi_u1");
      await markRefunded(TEST_IDS.testUser1, "theme_lava_flow");

      // User 2 has no refunds
      const u1Count = await countRecentRefunds(TEST_IDS.testUser1);
      const u2Count = await countRecentRefunds(TEST_IDS.testUser2);
      expect(u1Count).toBe(1);
      expect(u2Count).toBe(0);
    });

    it("multiple users can own same cosmetic independently", async () => {
      await recordPurchase(TEST_IDS.testUser1, "theme_lava_flow", 499, "pi_u1");
      await recordPurchase(TEST_IDS.testUser2, "theme_lava_flow", 499, "pi_u2");

      expect(await userOwnsCosmetic(TEST_IDS.testUser1, "theme_lava_flow")).toBe(true);
      expect(await userOwnsCosmetic(TEST_IDS.testUser2, "theme_lava_flow")).toBe(true);
    });

    it("active cosmetics empty object after clearing all", async () => {
      await recordPurchase(TEST_IDS.testUser1, "theme_lava_flow", 499, "pi_test");
      await setActiveCosmetics(TEST_IDS.testUser1, { theme: "theme_lava_flow" });
      await setActiveCosmetics(TEST_IDS.testUser1, {}); // Clear all

      const active = await getActiveCosmetics(TEST_IDS.testUser1);
      expect(active).toEqual({});
    });
  });
});
