/**
 * Integration tests for communities service.
 * Uses PGlite in-memory database with seed data.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { getTestDb, closeTestDb, TEST_IDS } from "@/tests/unit/database/helpers";
import type { PGlite } from "@electric-sql/pglite";

// Mock the db module to use PGlite
vi.mock("@/lib/db", async () => {
  const helpers = await import("@/tests/unit/database/helpers");
  let db: PGlite;
  return {
    query: async (text: string, params?: unknown[]) => {
      if (!db) db = await helpers.getTestDb();
      return db.query(text, params);
    },
    queryOne: async (text: string, params?: unknown[]) => {
      if (!db) db = await helpers.getTestDb();
      const result = await db.query(text, params);
      return result.rows[0] ?? null;
    },
    queryAll: async (text: string, params?: unknown[]) => {
      if (!db) db = await helpers.getTestDb();
      const result = await db.query(text, params);
      return result.rows;
    },
  };
});

import {
  createCommunity,
  getCommunityById,
  getCommunityByName,
  listCommunities,
  updateCommunity,
  joinCommunity,
  leaveCommunity,
  getMembership,
  isAdmin,
  ServiceError,
} from "@/lib/services/communities.service";
import {
  createCommunitySchema,
  updateCommunitySchema,
  listCommunitiesSchema,
} from "@/lib/validation/communities";

let db: PGlite;

describe("communities service", () => {
  beforeAll(async () => {
    db = await getTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    // Clean up test-created communities and memberships (keep seed data)
    await db.exec(
      `DELETE FROM community_memberships
       WHERE community_id NOT IN (
         '30000000-0000-0000-0000-000000000001',
         '30000000-0000-0000-0000-000000000002'
       )`
    );
    await db.exec(
      `DELETE FROM ai_prompt_history
       WHERE entity_id NOT IN (
         '30000000-0000-0000-0000-000000000001',
         '30000000-0000-0000-0000-000000000002'
       )`
    );
    await db.exec(
      `DELETE FROM communities
       WHERE id NOT IN (
         '30000000-0000-0000-0000-000000000001',
         '30000000-0000-0000-0000-000000000002'
       )`
    );
    // Restore seed membership state
    await db.exec(
      `UPDATE communities SET member_count = 3 WHERE id = '30000000-0000-0000-0000-000000000001'`
    );
    await db.exec(
      `UPDATE communities SET member_count = 2 WHERE id = '30000000-0000-0000-0000-000000000002'`
    );
  });

  // ─── Create Community ──────────────────────────────────────

  describe("createCommunity", () => {
    it("should create a community with valid input", async () => {
      const result = await createCommunity(
        {
          name: "new_community",
          display_name: "New Community",
          description: "A brand new test community",
          category: "technology",
        },
        TEST_IDS.testUser1
      );

      expect(result).toBeDefined();
      expect(result.name).toBe("new_community");
      expect(result.display_name).toBe("New Community");
      expect(result.description).toBe("A brand new test community");
      expect(result.member_count).toBe(1);
      expect(result.ai_prompt).toBeTruthy();
    });

    it("should auto-join creator as admin", async () => {
      const community = await createCommunity(
        {
          name: "admin_test",
          display_name: "Admin Test",
          description: "Testing admin auto-join",
          category: "science",
        },
        TEST_IDS.testUser2
      );

      const membership = await getMembership(TEST_IDS.testUser2, community.id);
      expect(membership).toBeDefined();
      expect(membership!.role).toBe("admin");
    });

    it("should log initial prompt in history", async () => {
      const community = await createCommunity(
        {
          name: "prompt_history",
          display_name: "Prompt History Test",
          description: "Testing prompt history",
          category: "technology",
        },
        TEST_IDS.testUser1
      );

      const result = await db.query(
        `SELECT * FROM ai_prompt_history WHERE entity_id = $1`,
        [community.id]
      );
      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });

    it("should reject duplicate community names", async () => {
      await createCommunity(
        {
          name: "unique_name",
          display_name: "Unique",
          description: "First one",
          category: "technology",
        },
        TEST_IDS.testUser1
      );

      await expect(
        createCommunity(
          {
            name: "unique_name",
            display_name: "Different Display",
            description: "Second one",
            category: "science",
          },
          TEST_IDS.testUser2
        )
      ).rejects.toThrow(ServiceError);

      try {
        await createCommunity(
          {
            name: "unique_name",
            display_name: "Different Display",
            description: "Second one",
            category: "science",
          },
          TEST_IDS.testUser2
        );
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceError);
        expect((err as ServiceError).code).toBe("NAME_TAKEN");
        expect((err as ServiceError).status).toBe(409);
      }
    });

    it("should set default AI prompt based on category", async () => {
      const community = await createCommunity(
        {
          name: "science_comm",
          display_name: "Science Comm",
          description: "Science community",
          category: "science",
        },
        TEST_IDS.testUser1
      );

      expect(community.ai_prompt).toContain("science");
    });
  });

  // ─── Read Community ────────────────────────────────────────

  describe("getCommunityById", () => {
    it("should return a community by ID", async () => {
      const result = await getCommunityById(TEST_IDS.communityTestTech);
      expect(result).toBeDefined();
      expect(result!.name).toBe("test_tech");
      expect(result!.display_name).toBe("Test Technology");
    });

    it("should return null for non-existent ID", async () => {
      const result = await getCommunityById("99999999-9999-9999-9999-999999999999");
      expect(result).toBeNull();
    });

    it("should return null for soft-deleted community", async () => {
      await db.exec(
        `UPDATE communities SET deleted_at = NOW()
         WHERE id = '30000000-0000-0000-0000-000000000002'`
      );

      const result = await getCommunityById(TEST_IDS.communityDemoScience);
      expect(result).toBeNull();

      // Restore
      await db.exec(
        `UPDATE communities SET deleted_at = NULL
         WHERE id = '30000000-0000-0000-0000-000000000002'`
      );
    });
  });

  describe("getCommunityByName", () => {
    it("should return a community by name", async () => {
      const result = await getCommunityByName("test_tech");
      expect(result).toBeDefined();
      expect(result!.id).toBe(TEST_IDS.communityTestTech);
    });

    it("should return null for non-existent name", async () => {
      const result = await getCommunityByName("does_not_exist");
      expect(result).toBeNull();
    });
  });

  describe("listCommunities", () => {
    it("should list all communities", async () => {
      const result = await listCommunities({
        sort: "members",
        limit: 25,
        offset: 0,
      });

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter by category", async () => {
      const result = await listCommunities({
        category: "technology",
        sort: "members",
        limit: 25,
        offset: 0,
      });

      expect(result.length).toBeGreaterThanOrEqual(1);
      result.forEach((c) => {
        expect(c.category_name).toBe("technology");
      });
    });

    it("should sort by activity", async () => {
      const result = await listCommunities({
        sort: "activity",
        limit: 25,
        offset: 0,
      });

      expect(result.length).toBeGreaterThanOrEqual(2);
      // First community should have higher post_count
      if (result.length >= 2) {
        expect(result[0].post_count).toBeGreaterThanOrEqual(result[1].post_count);
      }
    });

    it("should sort by created_at", async () => {
      const result = await listCommunities({
        sort: "created_at",
        limit: 25,
        offset: 0,
      });

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it("should paginate correctly", async () => {
      const all = await listCommunities({
        sort: "members",
        limit: 25,
        offset: 0,
      });

      const page1 = await listCommunities({
        sort: "members",
        limit: 1,
        offset: 0,
      });

      expect(page1.length).toBe(1);
      expect(page1[0].id).toBe(all[0].id);
    });

    it("should exclude banned communities", async () => {
      await db.exec(
        `UPDATE communities SET is_banned = TRUE
         WHERE id = '30000000-0000-0000-0000-000000000002'`
      );

      const result = await listCommunities({
        sort: "members",
        limit: 25,
        offset: 0,
      });

      const bannedIds = result.map((c) => c.id);
      expect(bannedIds).not.toContain(TEST_IDS.communityDemoScience);

      // Restore
      await db.exec(
        `UPDATE communities SET is_banned = FALSE
         WHERE id = '30000000-0000-0000-0000-000000000002'`
      );
    });
  });

  // ─── Update Community ──────────────────────────────────────

  describe("updateCommunity", () => {
    it("should update community description (admin only)", async () => {
      const result = await updateCommunity(
        TEST_IDS.communityTestTech,
        TEST_IDS.testUser1, // admin of test_tech
        { description: "Updated description for test_tech" }
      );

      expect(result.description).toBe("Updated description for test_tech");

      // Restore
      await db.exec(
        `UPDATE communities SET description = 'A test community for technology discussions during development.'
         WHERE id = '30000000-0000-0000-0000-000000000001'`
      );
    });

    it("should update display_name", async () => {
      const result = await updateCommunity(
        TEST_IDS.communityTestTech,
        TEST_IDS.testUser1,
        { display_name: "Updated Tech Community" }
      );

      expect(result.display_name).toBe("Updated Tech Community");

      // Restore
      await db.exec(
        `UPDATE communities SET display_name = 'Test Technology'
         WHERE id = '30000000-0000-0000-0000-000000000001'`
      );
    });

    it("should reject non-admin updates", async () => {
      await expect(
        updateCommunity(
          TEST_IDS.communityTestTech,
          TEST_IDS.testUser2, // member, not admin
          { description: "Hacked!" }
        )
      ).rejects.toThrow(ServiceError);

      try {
        await updateCommunity(
          TEST_IDS.communityTestTech,
          TEST_IDS.testUser2,
          { description: "Hacked!" }
        );
      } catch (err) {
        expect((err as ServiceError).code).toBe("FORBIDDEN");
        expect((err as ServiceError).status).toBe(403);
      }
    });

    it("should return existing if no updates provided", async () => {
      const result = await updateCommunity(
        TEST_IDS.communityTestTech,
        TEST_IDS.testUser1,
        {}
      );

      expect(result).toBeDefined();
      expect(result.name).toBe("test_tech");
    });

    it("should reject update for non-existent community", async () => {
      await expect(
        updateCommunity(
          "99999999-9999-9999-9999-999999999999",
          TEST_IDS.testUser1,
          { description: "Nope" }
        )
      ).rejects.toThrow(ServiceError);
    });
  });

  // ─── Join / Leave ──────────────────────────────────────────

  describe("joinCommunity", () => {
    it("should allow a user to join a community", async () => {
      // testUser1 is not a member of demo_science in seed data
      const membership = await joinCommunity(
        TEST_IDS.communityDemoScience,
        TEST_IDS.testUser1
      );

      expect(membership).toBeDefined();
      expect(membership.role).toBe("member");
      expect(membership.user_id).toBe(TEST_IDS.testUser1);
      expect(membership.community_id).toBe(TEST_IDS.communityDemoScience);

      // Clean up
      await db.exec(
        `DELETE FROM community_memberships
         WHERE user_id = '${TEST_IDS.testUser1}'
         AND community_id = '${TEST_IDS.communityDemoScience}'`
      );
      await db.exec(
        `UPDATE communities SET member_count = 2
         WHERE id = '30000000-0000-0000-0000-000000000002'`
      );
    });

    it("should increment member count on join", async () => {
      const before = await getCommunityById(TEST_IDS.communityDemoScience);
      const beforeCount = before!.member_count;

      await joinCommunity(TEST_IDS.communityDemoScience, TEST_IDS.testUser1);

      const after = await getCommunityById(TEST_IDS.communityDemoScience);
      expect(after!.member_count).toBe(beforeCount + 1);

      // Clean up
      await db.exec(
        `DELETE FROM community_memberships
         WHERE user_id = '${TEST_IDS.testUser1}'
         AND community_id = '${TEST_IDS.communityDemoScience}'`
      );
      await db.exec(
        `UPDATE communities SET member_count = ${beforeCount}
         WHERE id = '30000000-0000-0000-0000-000000000002'`
      );
    });

    it("should reject double-join", async () => {
      // testUser2 is already a member of test_tech
      await expect(
        joinCommunity(TEST_IDS.communityTestTech, TEST_IDS.testUser2)
      ).rejects.toThrow(ServiceError);

      try {
        await joinCommunity(TEST_IDS.communityTestTech, TEST_IDS.testUser2);
      } catch (err) {
        expect((err as ServiceError).code).toBe("ALREADY_MEMBER");
      }
    });

    it("should reject joining a non-existent community", async () => {
      await expect(
        joinCommunity("99999999-9999-9999-9999-999999999999", TEST_IDS.testUser1)
      ).rejects.toThrow(ServiceError);
    });

    it("should reject joining a banned community", async () => {
      await db.exec(
        `UPDATE communities SET is_banned = TRUE
         WHERE id = '30000000-0000-0000-0000-000000000002'`
      );

      await expect(
        joinCommunity(TEST_IDS.communityDemoScience, TEST_IDS.testUser1)
      ).rejects.toThrow(ServiceError);

      try {
        await joinCommunity(TEST_IDS.communityDemoScience, TEST_IDS.testUser1);
      } catch (err) {
        expect((err as ServiceError).code).toBe("COMMUNITY_BANNED");
      }

      // Restore
      await db.exec(
        `UPDATE communities SET is_banned = FALSE
         WHERE id = '30000000-0000-0000-0000-000000000002'`
      );
    });
  });

  describe("leaveCommunity", () => {
    it("should allow a member to leave", async () => {
      // testUser2 is a member of test_tech
      await leaveCommunity(TEST_IDS.communityTestTech, TEST_IDS.testUser2);

      const membership = await getMembership(TEST_IDS.testUser2, TEST_IDS.communityTestTech);
      expect(membership).toBeNull();

      // Restore
      await db.exec(
        `INSERT INTO community_memberships (user_id, community_id, role)
         VALUES ('${TEST_IDS.testUser2}', '${TEST_IDS.communityTestTech}', 'member')`
      );
      await db.exec(
        `UPDATE communities SET member_count = 3
         WHERE id = '30000000-0000-0000-0000-000000000001'`
      );
    });

    it("should decrement member count on leave", async () => {
      const before = await getCommunityById(TEST_IDS.communityTestTech);
      const beforeCount = before!.member_count;

      await leaveCommunity(TEST_IDS.communityTestTech, TEST_IDS.testUser2);

      const after = await getCommunityById(TEST_IDS.communityTestTech);
      expect(after!.member_count).toBe(beforeCount - 1);

      // Restore
      await db.exec(
        `INSERT INTO community_memberships (user_id, community_id, role)
         VALUES ('${TEST_IDS.testUser2}', '${TEST_IDS.communityTestTech}', 'member')`
      );
      await db.exec(
        `UPDATE communities SET member_count = ${beforeCount}
         WHERE id = '30000000-0000-0000-0000-000000000001'`
      );
    });

    it("should reject leaving if not a member", async () => {
      await expect(
        leaveCommunity(TEST_IDS.communityDemoScience, TEST_IDS.testUser1)
      ).rejects.toThrow(ServiceError);

      try {
        await leaveCommunity(TEST_IDS.communityDemoScience, TEST_IDS.testUser1);
      } catch (err) {
        expect((err as ServiceError).code).toBe("NOT_MEMBER");
      }
    });

    it("should reject last admin leaving", async () => {
      // testUser1 is the only admin of test_tech
      await expect(
        leaveCommunity(TEST_IDS.communityTestTech, TEST_IDS.testUser1)
      ).rejects.toThrow(ServiceError);

      try {
        await leaveCommunity(TEST_IDS.communityTestTech, TEST_IDS.testUser1);
      } catch (err) {
        expect((err as ServiceError).code).toBe("LAST_ADMIN");
        expect((err as ServiceError).status).toBe(400);
      }
    });

    it("should reject leaving non-existent community", async () => {
      await expect(
        leaveCommunity("99999999-9999-9999-9999-999999999999", TEST_IDS.testUser1)
      ).rejects.toThrow(ServiceError);
    });
  });

  // ─── Helpers ───────────────────────────────────────────────

  describe("getMembership", () => {
    it("should return membership for an existing member", async () => {
      const result = await getMembership(TEST_IDS.testUser1, TEST_IDS.communityTestTech);
      expect(result).toBeDefined();
      expect(result!.role).toBe("admin");
    });

    it("should return null for non-members", async () => {
      const result = await getMembership(TEST_IDS.testUser1, TEST_IDS.communityDemoScience);
      expect(result).toBeNull();
    });
  });

  describe("isAdmin", () => {
    it("should return true for admins", async () => {
      const result = await isAdmin(TEST_IDS.testUser1, TEST_IDS.communityTestTech);
      expect(result).toBe(true);
    });

    it("should return false for regular members", async () => {
      const result = await isAdmin(TEST_IDS.testUser2, TEST_IDS.communityTestTech);
      expect(result).toBe(false);
    });

    it("should return false for non-members", async () => {
      const result = await isAdmin(TEST_IDS.testUser1, TEST_IDS.communityDemoScience);
      expect(result).toBe(false);
    });
  });
});

// ─── Validation Tests ────────────────────────────────────────

describe("community validation schemas", () => {

  describe("createCommunitySchema", () => {
    it("should accept valid input", () => {
      const result = createCommunitySchema.safeParse({
        name: "valid_name",
        display_name: "Valid Name",
        description: "A valid description",
        category: "technology",
      });
      expect(result.success).toBe(true);
    });

    it("should reject names shorter than 3 chars", () => {
      const result = createCommunitySchema.safeParse({
        name: "ab",
        display_name: "Test",
        description: "Test",
        category: "technology",
      });
      expect(result.success).toBe(false);
    });

    it("should reject names longer than 21 chars", () => {
      const result = createCommunitySchema.safeParse({
        name: "a".repeat(22),
        display_name: "Test",
        description: "Test",
        category: "technology",
      });
      expect(result.success).toBe(false);
    });

    it("should reject names with special characters", () => {
      const result = createCommunitySchema.safeParse({
        name: "invalid-name!",
        display_name: "Test",
        description: "Test",
        category: "technology",
      });
      expect(result.success).toBe(false);
    });

    it("should reject uppercase names", () => {
      const result = createCommunitySchema.safeParse({
        name: "InvalidName",
        display_name: "Test",
        description: "Test",
        category: "technology",
      });
      expect(result.success).toBe(false);
    });

    it("should reject descriptions over 500 chars", () => {
      const result = createCommunitySchema.safeParse({
        name: "test_name",
        display_name: "Test",
        description: "x".repeat(501),
        category: "technology",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid categories", () => {
      const result = createCommunitySchema.safeParse({
        name: "test_name",
        display_name: "Test",
        description: "Test",
        category: "invalid_category",
      });
      expect(result.success).toBe(false);
    });

    it("should accept all 5 valid categories", () => {
      const categories = ["technology", "science", "politics", "entertainment", "sports"];
      for (const category of categories) {
        const result = createCommunitySchema.safeParse({
          name: "test_name",
          display_name: "Test",
          description: "Test",
          category,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("updateCommunitySchema", () => {
    it("should accept partial updates", () => {
      const result = updateCommunitySchema.safeParse({
        description: "Updated description",
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty object", () => {
      const result = updateCommunitySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should reject display_name over 100 chars", () => {
      const result = updateCommunitySchema.safeParse({
        display_name: "x".repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("listCommunitiesSchema", () => {
    it("should accept valid sort options", () => {
      for (const sort of ["members", "activity", "created_at"]) {
        const result = listCommunitiesSchema.safeParse({ sort });
        expect(result.success).toBe(true);
      }
    });

    it("should default sort to members", () => {
      const result = listCommunitiesSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort).toBe("members");
      }
    });

    it("should reject invalid sort options", () => {
      const result = listCommunitiesSchema.safeParse({ sort: "invalid" });
      expect(result.success).toBe(false);
    });
  });
});
