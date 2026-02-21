/**
 * Integration tests for votes service.
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
  voteOnPost,
  voteOnComment,
  getUserVote,
} from "@/lib/services/votes.service";

let db: PGlite;

describe("votes service", () => {
  beforeAll(async () => {
    db = await getTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    // Clean up test votes
    await db.exec(`DELETE FROM votes`);
    // Reset spark/douse counts to seed values
    await db.exec(`UPDATE posts SET sparks = 5, douses = 1 WHERE id = '${TEST_IDS.post1}'`);
    await db.exec(`UPDATE posts SET sparks = 8, douses = 0 WHERE id = '${TEST_IDS.post2}'`);
    await db.exec(`UPDATE posts SET sparks = 3, douses = 0 WHERE id = '${TEST_IDS.post3}'`);
    await db.exec(`UPDATE comments SET sparks = 2, douses = 0 WHERE id = '${TEST_IDS.comment1}'`);
    await db.exec(`UPDATE comments SET sparks = 1, douses = 0 WHERE id = '${TEST_IDS.comment2}'`);
    await db.exec(`UPDATE comments SET sparks = 3, douses = 0 WHERE id = '${TEST_IDS.comment3}'`);
    // Reset user spark scores
    await db.exec(`UPDATE users SET post_sparks = 15, comment_sparks = 8 WHERE id = '${TEST_IDS.testUser1}'`);
    await db.exec(`UPDATE users SET post_sparks = 5, comment_sparks = 3 WHERE id = '${TEST_IDS.testUser2}'`);
  });

  // ─── Post Voting ─────────────────────────────────────────

  describe("post voting", () => {
    it("creates a spark vote on a post", async () => {
      // testUser2 sparks post1 (authored by testUser1)
      const result = await voteOnPost(TEST_IDS.post1, TEST_IDS.testUser2, 1);

      expect(result.action).toBe("created");
      expect(result.vote).not.toBeNull();
      expect(result.vote!.vote_value).toBe(1);
      expect(result.sparks).toBe(6); // was 5, now 6
      expect(result.douses).toBe(1);
    });

    it("creates a douse vote on a post", async () => {
      const result = await voteOnPost(TEST_IDS.post1, TEST_IDS.testUser2, -1);

      expect(result.action).toBe("created");
      expect(result.vote!.vote_value).toBe(-1);
      expect(result.douses).toBe(2); // was 1, now 2
    });

    it("toggles off when voting same value again", async () => {
      // First vote: spark
      await voteOnPost(TEST_IDS.post1, TEST_IDS.testUser2, 1);

      // Second vote: spark again — should remove
      const result = await voteOnPost(TEST_IDS.post1, TEST_IDS.testUser2, 1);

      expect(result.action).toBe("removed");
      expect(result.vote).toBeNull();
      expect(result.sparks).toBe(5); // Back to original
    });

    it("switches vote when voting opposite value", async () => {
      // First vote: spark
      await voteOnPost(TEST_IDS.post1, TEST_IDS.testUser2, 1);

      // Second vote: douse — should switch
      const result = await voteOnPost(TEST_IDS.post1, TEST_IDS.testUser2, -1);

      expect(result.action).toBe("updated");
      expect(result.vote!.vote_value).toBe(-1);
      expect(result.sparks).toBe(5); // +1 then -1 = back to 5
      expect(result.douses).toBe(2); // +1 = 2
    });

    it("prevents self-voting on own post", async () => {
      // testUser1 trying to vote on their own post1
      await expect(
        voteOnPost(TEST_IDS.post1, TEST_IDS.testUser1, 1)
      ).rejects.toThrow("Cannot vote on your own post");
    });

    it("throws POST_NOT_FOUND for invalid post", async () => {
      await expect(
        voteOnPost("99999999-9999-9999-9999-999999999999", TEST_IDS.testUser1, 1)
      ).rejects.toThrow("Post not found");
    });

    it("updates author spark score on spark", async () => {
      const beforeUser = await db.query<{ post_sparks: number }>(
        `SELECT post_sparks FROM users WHERE id = $1`,
        [TEST_IDS.testUser1]
      );

      await voteOnPost(TEST_IDS.post1, TEST_IDS.testUser2, 1);

      const afterUser = await db.query<{ post_sparks: number }>(
        `SELECT post_sparks FROM users WHERE id = $1`,
        [TEST_IDS.testUser1]
      );

      expect(afterUser.rows[0].post_sparks).toBe(beforeUser.rows[0].post_sparks + 1);
    });

    it("updates author spark score on douse", async () => {
      const beforeUser = await db.query<{ post_sparks: number }>(
        `SELECT post_sparks FROM users WHERE id = $1`,
        [TEST_IDS.testUser1]
      );

      await voteOnPost(TEST_IDS.post1, TEST_IDS.testUser2, -1);

      const afterUser = await db.query<{ post_sparks: number }>(
        `SELECT post_sparks FROM users WHERE id = $1`,
        [TEST_IDS.testUser1]
      );

      expect(afterUser.rows[0].post_sparks).toBe(beforeUser.rows[0].post_sparks - 1);
    });
  });

  // ─── Comment Voting ──────────────────────────────────────

  describe("comment voting", () => {
    it("creates a spark vote on a comment", async () => {
      // testUser1 sparks comment1 (authored by testUser2)
      const result = await voteOnComment(TEST_IDS.comment1, TEST_IDS.testUser1, 1);

      expect(result.action).toBe("created");
      expect(result.vote!.vote_value).toBe(1);
      expect(result.sparks).toBe(3); // was 2, now 3
    });

    it("creates a douse vote on a comment", async () => {
      const result = await voteOnComment(TEST_IDS.comment1, TEST_IDS.testUser1, -1);

      expect(result.action).toBe("created");
      expect(result.douses).toBe(1); // was 0, now 1
    });

    it("toggles off comment vote", async () => {
      await voteOnComment(TEST_IDS.comment1, TEST_IDS.testUser1, 1);
      const result = await voteOnComment(TEST_IDS.comment1, TEST_IDS.testUser1, 1);

      expect(result.action).toBe("removed");
      expect(result.vote).toBeNull();
      expect(result.sparks).toBe(2); // Back to original
    });

    it("switches comment vote", async () => {
      await voteOnComment(TEST_IDS.comment1, TEST_IDS.testUser1, 1);
      const result = await voteOnComment(TEST_IDS.comment1, TEST_IDS.testUser1, -1);

      expect(result.action).toBe("updated");
      expect(result.vote!.vote_value).toBe(-1);
    });

    it("prevents self-voting on own comment", async () => {
      // comment1 is authored by testUser2
      await expect(
        voteOnComment(TEST_IDS.comment1, TEST_IDS.testUser2, 1)
      ).rejects.toThrow("Cannot vote on your own comment");
    });

    it("updates author comment_sparks on spark", async () => {
      const before = await db.query<{ comment_sparks: number }>(
        `SELECT comment_sparks FROM users WHERE id = $1`,
        [TEST_IDS.testUser2]
      );

      await voteOnComment(TEST_IDS.comment1, TEST_IDS.testUser1, 1);

      const after = await db.query<{ comment_sparks: number }>(
        `SELECT comment_sparks FROM users WHERE id = $1`,
        [TEST_IDS.testUser2]
      );

      expect(after.rows[0].comment_sparks).toBe(before.rows[0].comment_sparks + 1);
    });
  });

  // ─── getUserVote ─────────────────────────────────────────

  describe("getUserVote", () => {
    it("returns null when user has not voted", async () => {
      const vote = await getUserVote(TEST_IDS.testUser2, "post", TEST_IDS.post1);
      expect(vote).toBeNull();
    });

    it("returns the vote after user has voted", async () => {
      await voteOnPost(TEST_IDS.post1, TEST_IDS.testUser2, 1);
      const vote = await getUserVote(TEST_IDS.testUser2, "post", TEST_IDS.post1);
      expect(vote).not.toBeNull();
      expect(vote!.vote_value).toBe(1);
    });

    it("returns null after vote is toggled off", async () => {
      await voteOnPost(TEST_IDS.post1, TEST_IDS.testUser2, 1);
      await voteOnPost(TEST_IDS.post1, TEST_IDS.testUser2, 1); // toggle off
      const vote = await getUserVote(TEST_IDS.testUser2, "post", TEST_IDS.post1);
      expect(vote).toBeNull();
    });
  });
});
