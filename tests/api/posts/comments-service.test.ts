/**
 * Integration tests for comments service.
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
  createComment,
  getCommentsForPost,
  updateComment,
  deleteComment,
} from "@/lib/services/comments.service";
import { ServiceError } from "@/lib/services/posts.service";

let db: PGlite;

describe("comments service", () => {
  beforeAll(async () => {
    db = await getTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    // Clean up test-created comments (keep seed comments)
    await db.exec(
      `DELETE FROM moderation_log WHERE content_id NOT IN (
        '40000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000002',
        '40000000-0000-0000-0000-000000000003',
        '50000000-0000-0000-0000-000000000001',
        '50000000-0000-0000-0000-000000000002',
        '50000000-0000-0000-0000-000000000003'
      )`
    );
    await db.exec(
      `DELETE FROM comments WHERE id NOT IN (
        '50000000-0000-0000-0000-000000000001',
        '50000000-0000-0000-0000-000000000002',
        '50000000-0000-0000-0000-000000000003'
      )`
    );
    // Reset comment_count for seed posts
    await db.exec(`UPDATE posts SET comment_count = 2 WHERE id = '${TEST_IDS.post1}'`);
    await db.exec(`UPDATE posts SET comment_count = 1 WHERE id = '${TEST_IDS.post2}'`);
    await db.exec(`UPDATE posts SET comment_count = 0 WHERE id = '${TEST_IDS.post3}'`);
  });

  // ─── Create ──────────────────────────────────────────────

  it("creates a top-level comment", async () => {
    const result = await createComment(
      TEST_IDS.post1,
      { body: "This is a test comment." },
      TEST_IDS.testUser1
    );

    expect(result.id).toBeDefined();
    expect(result.body).toBe("This is a test comment.");
    expect(result.depth).toBe(0);
    expect(result.parent_id).toBeNull();
    expect(result.is_approved).toBe(true);
    expect(result.moderation.decision).toBe("approved");
  });

  it("creates a reply to an existing comment", async () => {
    const result = await createComment(
      TEST_IDS.post1,
      { body: "This is a reply.", parent_id: TEST_IDS.comment1 },
      TEST_IDS.testUser1
    );

    expect(result.parent_id).toBe(TEST_IDS.comment1);
    expect(result.depth).toBe(1);
  });

  it("increments post comment_count", async () => {
    const before = await db.query<{ comment_count: number }>(
      `SELECT comment_count FROM posts WHERE id = $1`,
      [TEST_IDS.post3]
    );

    await createComment(
      TEST_IDS.post3,
      { body: "New comment on post 3" },
      TEST_IDS.testUser1
    );

    const after = await db.query<{ comment_count: number }>(
      `SELECT comment_count FROM posts WHERE id = $1`,
      [TEST_IDS.post3]
    );

    expect(after.rows[0].comment_count).toBe(before.rows[0].comment_count + 1);
  });

  it("throws POST_NOT_FOUND for invalid post", async () => {
    await expect(
      createComment(
        "99999999-9999-9999-9999-999999999999",
        { body: "Bad post ID" },
        TEST_IDS.testUser1
      )
    ).rejects.toThrow("Post not found");
  });

  it("throws PARENT_NOT_FOUND for invalid parent", async () => {
    await expect(
      createComment(
        TEST_IDS.post1,
        { body: "Bad parent", parent_id: "99999999-9999-9999-9999-999999999999" },
        TEST_IDS.testUser1
      )
    ).rejects.toThrow("Parent comment not found");
  });

  it("throws INVALID_PARENT when parent belongs to different post", async () => {
    // comment3 belongs to post2
    await expect(
      createComment(
        TEST_IDS.post1,
        { body: "Wrong post parent", parent_id: TEST_IDS.comment3 },
        TEST_IDS.testUser1
      )
    ).rejects.toThrow("Parent comment belongs to a different post");
  });

  // ─── Deep threading (10 levels) ─────────────────────────

  it("enforces max depth of 10 levels", async () => {
    // Build a chain of comments, each replying to the previous
    let parentId = TEST_IDS.comment1; // depth 0

    // comment2 is already at depth 1, but we need to build from scratch
    // Create comments at depths 1 through 9
    for (let depth = 1; depth < 10; depth++) {
      const reply = await createComment(
        TEST_IDS.post1,
        { body: `Depth ${depth} comment`, parent_id: parentId },
        TEST_IDS.testUser1
      );
      expect(reply.depth).toBe(depth);
      parentId = reply.id;
    }

    // Depth 10 should be rejected
    await expect(
      createComment(
        TEST_IDS.post1,
        { body: "Too deep!", parent_id: parentId },
        TEST_IDS.testUser1
      )
    ).rejects.toThrow("Maximum comment depth");
  });

  // ─── Read (threaded) ─────────────────────────────────────

  it("gets threaded comments for a post", async () => {
    const comments = await getCommentsForPost(TEST_IDS.post1);
    expect(comments.length).toBeGreaterThan(0);

    // Top-level comments should have no parent_id
    for (const comment of comments) {
      expect(comment.parent_id).toBeNull();
    }

    // Check that nested comments appear as children
    const firstComment = comments.find((c) => c.id === TEST_IDS.comment1);
    expect(firstComment).toBeDefined();
    expect(firstComment!.children).toBeDefined();
    expect(firstComment!.children!.length).toBeGreaterThan(0);
    expect(firstComment!.children![0].id).toBe(TEST_IDS.comment2);
  });

  it("sorts comments by top (default)", async () => {
    const comments = await getCommentsForPost(TEST_IDS.post1, "top");
    expect(comments.length).toBeGreaterThan(0);
  });

  it("sorts comments by new", async () => {
    const comments = await getCommentsForPost(TEST_IDS.post1, "new");
    expect(comments.length).toBeGreaterThan(0);
  });

  // ─── Update ──────────────────────────────────────────────

  it("updates a comment body and sets edited_at", async () => {
    const created = await createComment(
      TEST_IDS.post1,
      { body: "Original comment body" },
      TEST_IDS.testUser1
    );

    const updated = await updateComment(created.id, TEST_IDS.testUser1, {
      body: "Updated comment body",
    });

    expect(updated.body).toBe("Updated comment body");
    expect(updated.edited_at).not.toBeNull();
  });

  it("rejects edit by non-owner", async () => {
    const created = await createComment(
      TEST_IDS.post1,
      { body: "Owner only" },
      TEST_IDS.testUser1
    );

    await expect(
      updateComment(created.id, TEST_IDS.testUser2, { body: "Hacked!" })
    ).rejects.toThrow("Not authorized");
  });

  it("re-runs moderation on edit", async () => {
    const created = await createComment(
      TEST_IDS.post1,
      { body: "Clean comment" },
      TEST_IDS.testUser1
    );

    const logBefore = await db.query(
      `SELECT COUNT(*) as count FROM moderation_log WHERE content_id = $1`,
      [created.id]
    );

    await updateComment(created.id, TEST_IDS.testUser1, {
      body: "Edited comment body",
    });

    const logAfter = await db.query(
      `SELECT COUNT(*) as count FROM moderation_log WHERE content_id = $1`,
      [created.id]
    );

    expect(parseInt((logAfter.rows[0] as { count: string }).count, 10)).toBeGreaterThan(
      parseInt((logBefore.rows[0] as { count: string }).count, 10)
    );
  });

  // ─── Delete ──────────────────────────────────────────────

  it("soft deletes a comment", async () => {
    const created = await createComment(
      TEST_IDS.post1,
      { body: "Delete me" },
      TEST_IDS.testUser1
    );

    await deleteComment(created.id, TEST_IDS.testUser1);

    // Should have deleted_at set
    const raw = await db.query<{ deleted_at: string | null }>(
      `SELECT deleted_at FROM comments WHERE id = $1`,
      [created.id]
    );
    expect(raw.rows[0].deleted_at).not.toBeNull();
  });

  it("rejects delete by non-owner", async () => {
    const created = await createComment(
      TEST_IDS.post1,
      { body: "Not yours" },
      TEST_IDS.testUser1
    );

    await expect(
      deleteComment(created.id, TEST_IDS.testUser2)
    ).rejects.toThrow("Not authorized");
  });

  it("preserves thread structure after delete", async () => {
    // Create parent and child
    const parent = await createComment(
      TEST_IDS.post1,
      { body: "Parent to delete" },
      TEST_IDS.testUser1
    );

    const child = await createComment(
      TEST_IDS.post1,
      { body: "Child of deleted parent", parent_id: parent.id },
      TEST_IDS.testUser2
    );

    // Delete parent
    await deleteComment(parent.id, TEST_IDS.testUser1);

    // Child should still reference the parent
    const childRow = await db.query<{ parent_id: string }>(
      `SELECT parent_id FROM comments WHERE id = $1`,
      [child.id]
    );
    expect(childRow.rows[0].parent_id).toBe(parent.id);
  });

  it("decrements post comment_count on delete", async () => {
    const created = await createComment(
      TEST_IDS.post3,
      { body: "Count test" },
      TEST_IDS.testUser1
    );

    const before = await db.query<{ comment_count: number }>(
      `SELECT comment_count FROM posts WHERE id = $1`,
      [TEST_IDS.post3]
    );

    await deleteComment(created.id, TEST_IDS.testUser1);

    const after = await db.query<{ comment_count: number }>(
      `SELECT comment_count FROM posts WHERE id = $1`,
      [TEST_IDS.post3]
    );

    expect(after.rows[0].comment_count).toBe(before.rows[0].comment_count - 1);
  });
});
