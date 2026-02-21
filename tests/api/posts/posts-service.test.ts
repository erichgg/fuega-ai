/**
 * Integration tests for posts service.
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
  createPost,
  getPostById,
  listPosts,
  updatePost,
  deletePost,
  ServiceError,
} from "@/lib/services/posts.service";

let db: PGlite;

describe("posts service", () => {
  beforeAll(async () => {
    db = await getTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    // Clean up test-created posts (keep seed posts)
    await db.exec(
      `DELETE FROM moderation_log WHERE content_id NOT IN (
        '40000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000002',
        '40000000-0000-0000-0000-000000000003'
      ) AND content_type = 'post'`
    );
    await db.exec(
      `DELETE FROM votes WHERE votable_id NOT IN (
        '40000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000002',
        '40000000-0000-0000-0000-000000000003'
      )`
    );
    await db.exec(
      `DELETE FROM posts WHERE id NOT IN (
        '40000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000002',
        '40000000-0000-0000-0000-000000000003'
      )`
    );
    // Reset post_count for test community
    await db.exec(
      `UPDATE communities SET post_count = 2 WHERE id = '${TEST_IDS.communityTestTech}'`
    );
  });

  // ─── Create ──────────────────────────────────────────────

  it("creates a text post with moderation", async () => {
    const result = await createPost(
      {
        community_id: TEST_IDS.communityTestTech,
        title: "Integration test post",
        body: "This is a test post body for integration testing.",
        post_type: "text",
      },
      TEST_IDS.testUser1
    );

    expect(result.id).toBeDefined();
    expect(result.title).toBe("Integration test post");
    expect(result.post_type).toBe("text");
    expect(result.author_id).toBe(TEST_IDS.testUser1);
    expect(result.is_approved).toBe(true);
    expect(result.moderation.decision).toBe("approved");
  });

  it("creates a link post", async () => {
    const result = await createPost(
      {
        community_id: TEST_IDS.communityTestTech,
        title: "Cool link",
        post_type: "link",
        url: "https://example.com/article",
      },
      TEST_IDS.testUser1
    );

    expect(result.post_type).toBe("link");
    expect(result.url).toBe("https://example.com/article");
  });

  it("throws COMMUNITY_NOT_FOUND for invalid community", async () => {
    await expect(
      createPost(
        {
          community_id: "99999999-9999-9999-9999-999999999999",
          title: "Bad community",
          post_type: "text",
          body: "Test",
        },
        TEST_IDS.testUser1
      )
    ).rejects.toThrow("Community not found");
  });

  it("increments community post_count", async () => {
    const before = await db.query<{ post_count: number }>(
      `SELECT post_count FROM communities WHERE id = $1`,
      [TEST_IDS.communityTestTech]
    );

    await createPost(
      {
        community_id: TEST_IDS.communityTestTech,
        title: "Post count test",
        post_type: "text",
        body: "Testing post count increment",
      },
      TEST_IDS.testUser1
    );

    const after = await db.query<{ post_count: number }>(
      `SELECT post_count FROM communities WHERE id = $1`,
      [TEST_IDS.communityTestTech]
    );

    expect(after.rows[0].post_count).toBe(before.rows[0].post_count + 1);
  });

  // ─── Read ────────────────────────────────────────────────

  it("gets a post by ID with author and community info", async () => {
    const post = await getPostById(TEST_IDS.post1);
    expect(post).not.toBeNull();
    expect(post!.title).toBe("Welcome to f/test_tech!");
    expect(post!.author_username).toBe("test_user_1");
    expect(post!.community_name).toBe("test_tech");
  });

  it("returns null for nonexistent post", async () => {
    const post = await getPostById("99999999-9999-9999-9999-999999999999");
    expect(post).toBeNull();
  });

  it("lists posts with default sort (hot)", async () => {
    const posts = await listPosts({ sort: "hot", limit: 25, offset: 0 });
    expect(posts.length).toBeGreaterThan(0);
    // All returned posts should be approved and not removed
    for (const post of posts) {
      expect(post.is_approved).toBe(true);
      expect(post.is_removed).toBe(false);
    }
  });

  it("lists posts sorted by new", async () => {
    const posts = await listPosts({ sort: "new", limit: 25, offset: 0 });
    expect(posts.length).toBeGreaterThan(0);
    // Posts should be in descending chronological order
    for (let i = 1; i < posts.length; i++) {
      expect(new Date(posts[i - 1].created_at).getTime())
        .toBeGreaterThanOrEqual(new Date(posts[i].created_at).getTime());
    }
  });

  it("lists posts sorted by top", async () => {
    const posts = await listPosts({ sort: "top", limit: 25, offset: 0 });
    expect(posts.length).toBeGreaterThan(0);
    // Posts should be in descending net sparks order
    for (let i = 1; i < posts.length; i++) {
      const prev = posts[i - 1].sparks - posts[i - 1].douses;
      const curr = posts[i].sparks - posts[i].douses;
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it("filters posts by community name", async () => {
    const posts = await listPosts({
      community: "test_tech",
      sort: "new",
      limit: 25,
      offset: 0,
    });
    for (const post of posts) {
      expect(post.community_name).toBe("test_tech");
    }
  });

  it("respects limit and offset for pagination", async () => {
    const all = await listPosts({ sort: "new", limit: 100, offset: 0 });
    const page = await listPosts({ sort: "new", limit: 1, offset: 0 });
    expect(page).toHaveLength(1);
    expect(page[0].id).toBe(all[0].id);

    if (all.length > 1) {
      const page2 = await listPosts({ sort: "new", limit: 1, offset: 1 });
      expect(page2[0].id).toBe(all[1].id);
    }
  });

  // ─── Update ──────────────────────────────────────────────

  it("updates a post title and sets edited_at", async () => {
    // Create a post first
    const created = await createPost(
      {
        community_id: TEST_IDS.communityTestTech,
        title: "Original Title",
        post_type: "text",
        body: "Original body",
      },
      TEST_IDS.testUser1
    );

    const updated = await updatePost(created.id, TEST_IDS.testUser1, {
      title: "Updated Title",
    });

    expect(updated.title).toBe("Updated Title");
    expect(updated.edited_at).not.toBeNull();
  });

  it("updates a post body", async () => {
    const created = await createPost(
      {
        community_id: TEST_IDS.communityTestTech,
        title: "Body update test",
        post_type: "text",
        body: "Original body text",
      },
      TEST_IDS.testUser1
    );

    const updated = await updatePost(created.id, TEST_IDS.testUser1, {
      body: "Updated body text",
    });

    expect(updated.body).toBe("Updated body text");
  });

  it("rejects edit by non-owner", async () => {
    const created = await createPost(
      {
        community_id: TEST_IDS.communityTestTech,
        title: "Owner only edit",
        post_type: "text",
        body: "Test",
      },
      TEST_IDS.testUser1
    );

    await expect(
      updatePost(created.id, TEST_IDS.testUser2, { title: "Hacked!" })
    ).rejects.toThrow("Not authorized");
  });

  it("re-runs moderation on edit", async () => {
    const created = await createPost(
      {
        community_id: TEST_IDS.communityTestTech,
        title: "Clean post",
        post_type: "text",
        body: "Normal content",
      },
      TEST_IDS.testUser1
    );

    // Moderation log should exist for the creation
    const logBefore = await db.query(
      `SELECT COUNT(*) as count FROM moderation_log WHERE content_id = $1`,
      [created.id]
    );
    expect(parseInt((logBefore.rows[0] as { count: string }).count, 10)).toBeGreaterThanOrEqual(1);

    // Edit the post
    await updatePost(created.id, TEST_IDS.testUser1, { body: "Edited body" });

    // Should now have 2 moderation log entries
    const logAfter = await db.query(
      `SELECT COUNT(*) as count FROM moderation_log WHERE content_id = $1`,
      [created.id]
    );
    expect(parseInt((logAfter.rows[0] as { count: string }).count, 10)).toBeGreaterThanOrEqual(2);
  });

  // ─── Delete ──────────────────────────────────────────────

  it("soft deletes a post (sets deleted_at)", async () => {
    const created = await createPost(
      {
        community_id: TEST_IDS.communityTestTech,
        title: "Delete me",
        post_type: "text",
        body: "To be deleted",
      },
      TEST_IDS.testUser1
    );

    await deletePost(created.id, TEST_IDS.testUser1);

    // Should not be findable via getPostById
    const found = await getPostById(created.id);
    expect(found).toBeNull();

    // But should still exist in DB with deleted_at set
    const raw = await db.query<{ deleted_at: string | null }>(
      `SELECT deleted_at FROM posts WHERE id = $1`,
      [created.id]
    );
    expect(raw.rows[0].deleted_at).not.toBeNull();
  });

  it("rejects delete by non-owner", async () => {
    const created = await createPost(
      {
        community_id: TEST_IDS.communityTestTech,
        title: "Not yours to delete",
        post_type: "text",
        body: "Test",
      },
      TEST_IDS.testUser1
    );

    await expect(
      deletePost(created.id, TEST_IDS.testUser2)
    ).rejects.toThrow("Not authorized");
  });

  it("decrements community post_count on delete", async () => {
    const created = await createPost(
      {
        community_id: TEST_IDS.communityTestTech,
        title: "Count decrement test",
        post_type: "text",
        body: "Test",
      },
      TEST_IDS.testUser1
    );

    const before = await db.query<{ post_count: number }>(
      `SELECT post_count FROM communities WHERE id = $1`,
      [TEST_IDS.communityTestTech]
    );

    await deletePost(created.id, TEST_IDS.testUser1);

    const after = await db.query<{ post_count: number }>(
      `SELECT post_count FROM communities WHERE id = $1`,
      [TEST_IDS.communityTestTech]
    );

    expect(after.rows[0].post_count).toBe(before.rows[0].post_count - 1);
  });
});
