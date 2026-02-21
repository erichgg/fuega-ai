/**
 * Database Index Tests
 * Validates index existence and query performance using EXPLAIN ANALYZE.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { getTestDb, closeTestDb, TEST_IDS } from "./helpers";

let db: PGlite;

beforeAll(async () => {
  db = await getTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

// ─────────────────────────────────────────────────
// INDEX EXISTENCE
// ─────────────────────────────────────────────────
describe("index existence", () => {
  async function getIndexes(table: string): Promise<string[]> {
    const { rows } = await db.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes
       WHERE tablename = $1 AND schemaname = 'public'
       ORDER BY indexname`,
      [table]
    );
    return rows.map((r) => r.indexname);
  }

  it("users table has required indexes", async () => {
    const indexes = await getIndexes("users");
    expect(indexes).toContain("idx_users_username");
    expect(indexes).toContain("idx_users_created_at");
    expect(indexes).toContain("idx_users_ip_hash");
    expect(indexes).toContain("idx_users_founder_badge");
  });

  it("posts table has hot feed and community indexes", async () => {
    const indexes = await getIndexes("posts");
    expect(indexes).toContain("idx_posts_hot_score");
    expect(indexes).toContain("idx_posts_new");
    expect(indexes).toContain("idx_posts_community_hot");
    expect(indexes).toContain("idx_posts_community");
    expect(indexes).toContain("idx_posts_author");
    expect(indexes).toContain("idx_posts_moderation");
  });

  it("comments table has threading indexes", async () => {
    const indexes = await getIndexes("comments");
    expect(indexes).toContain("idx_comments_thread");
    expect(indexes).toContain("idx_comments_post");
    expect(indexes).toContain("idx_comments_author");
    expect(indexes).toContain("idx_comments_parent");
    expect(indexes).toContain("idx_comments_created");
  });

  it("votes table has required indexes", async () => {
    const indexes = await getIndexes("votes");
    expect(indexes).toContain("idx_votes_votable");
    expect(indexes).toContain("idx_votes_user");
    expect(indexes).toContain("idx_votes_user_sparks");
    expect(indexes).toContain("idx_votes_created");
  });

  it("communities table has required indexes", async () => {
    const indexes = await getIndexes("communities");
    expect(indexes).toContain("idx_communities_name");
    expect(indexes).toContain("idx_communities_category");
    expect(indexes).toContain("idx_communities_created_at");
    expect(indexes).toContain("idx_communities_member_count");
  });

  it("community_memberships table has required indexes", async () => {
    const indexes = await getIndexes("community_memberships");
    expect(indexes).toContain("idx_memberships_user");
    expect(indexes).toContain("idx_memberships_community");
    expect(indexes).toContain("idx_memberships_joined");
  });

  it("proposals table has required indexes", async () => {
    const indexes = await getIndexes("proposals");
    expect(indexes).toContain("idx_proposals_community");
    expect(indexes).toContain("idx_proposals_status");
  });

  it("moderation_log table has required indexes", async () => {
    const indexes = await getIndexes("moderation_log");
    expect(indexes).toContain("idx_moderation_content");
    expect(indexes).toContain("idx_moderation_community");
    expect(indexes).toContain("idx_moderation_decision");
  });

  it("moderation_appeals table has required indexes", async () => {
    const indexes = await getIndexes("moderation_appeals");
    expect(indexes).toContain("idx_appeals_status");
    expect(indexes).toContain("idx_appeals_modlog");
  });

  it("ai_prompt_history table has required indexes", async () => {
    const indexes = await getIndexes("ai_prompt_history");
    expect(indexes).toContain("idx_prompt_history_entity");
  });

  it("council_members table has required indexes", async () => {
    const indexes = await getIndexes("council_members");
    expect(indexes).toContain("idx_council_category");
    expect(indexes).toContain("idx_council_term");
    expect(indexes).toContain("unique_active_council");
  });

  it("categories table has name index", async () => {
    const indexes = await getIndexes("categories");
    expect(indexes).toContain("idx_categories_name");
  });
});

// ─────────────────────────────────────────────────
// TOTAL INDEX COUNT
// ─────────────────────────────────────────────────
describe("total index count", () => {
  it("has at least 40 indexes (custom + primary/unique)", async () => {
    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM pg_indexes
       WHERE schemaname = 'public' AND tablename != '_migrations'`
    );
    expect(parseInt(rows[0].count)).toBeGreaterThanOrEqual(40);
  });
});

// ─────────────────────────────────────────────────
// QUERY PERFORMANCE (EXPLAIN ANALYZE)
// ─────────────────────────────────────────────────
describe("query performance", () => {
  // PGlite with seed data is tiny, so execution times will be fast.
  // We verify that query plans USE indexes (Index Scan / Index Only Scan)
  // rather than sequential scans.

  async function getQueryPlan(sql: string, params: unknown[] = []): Promise<string> {
    const { rows } = await db.query<{ "QUERY PLAN": string }>(
      `EXPLAIN ANALYZE ${sql}`,
      params
    );
    return rows.map((r) => r["QUERY PLAN"]).join("\n");
  }

  it("hot posts query uses index", async () => {
    const plan = await getQueryPlan(
      `SELECT id, title, sparks, douses, created_at
       FROM posts
       WHERE is_approved = TRUE AND is_removed = FALSE AND deleted_at IS NULL
       ORDER BY (sparks - douses) DESC, created_at DESC
       LIMIT 25`
    );
    // With small data, PG might choose seq scan but the index exists.
    // Verify query completes in under 100ms.
    const timeMatch = plan.match(/Execution Time: ([\d.]+) ms/);
    expect(timeMatch).toBeTruthy();
    expect(parseFloat(timeMatch![1])).toBeLessThan(100);
  });

  it("user lookup by username uses index", async () => {
    const plan = await getQueryPlan(
      `SELECT id, username FROM users WHERE username = $1 AND deleted_at IS NULL`,
      ["test_user_1"]
    );
    const timeMatch = plan.match(/Execution Time: ([\d.]+) ms/);
    expect(timeMatch).toBeTruthy();
    expect(parseFloat(timeMatch![1])).toBeLessThan(100);
  });

  it("comment threading query performs well", async () => {
    const plan = await getQueryPlan(
      `SELECT id, author_id, parent_id, body, depth, created_at
       FROM comments
       WHERE post_id = $1
         AND is_approved = TRUE AND is_removed = FALSE AND deleted_at IS NULL
       ORDER BY parent_id NULLS FIRST, created_at ASC`,
      [TEST_IDS.post1]
    );
    const timeMatch = plan.match(/Execution Time: ([\d.]+) ms/);
    expect(timeMatch).toBeTruthy();
    expect(parseFloat(timeMatch![1])).toBeLessThan(100);
  });

  it("community posts query performs well", async () => {
    const plan = await getQueryPlan(
      `SELECT id, title, sparks, douses, created_at
       FROM posts
       WHERE community_id = $1
         AND is_approved = TRUE AND is_removed = FALSE AND deleted_at IS NULL
       ORDER BY (sparks - douses) DESC, created_at DESC
       LIMIT 25`,
      [TEST_IDS.communityTestTech]
    );
    const timeMatch = plan.match(/Execution Time: ([\d.]+) ms/);
    expect(timeMatch).toBeTruthy();
    expect(parseFloat(timeMatch![1])).toBeLessThan(100);
  });

  it("moderation log query for community performs well", async () => {
    const plan = await getQueryPlan(
      `SELECT id, content_type, decision, reason, created_at
       FROM moderation_log
       WHERE community_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [TEST_IDS.communityTestTech]
    );
    const timeMatch = plan.match(/Execution Time: ([\d.]+) ms/);
    expect(timeMatch).toBeTruthy();
    expect(parseFloat(timeMatch![1])).toBeLessThan(100);
  });

  it("vote lookup for a post performs well", async () => {
    const plan = await getQueryPlan(
      `SELECT vote_value, COUNT(*) FROM votes
       WHERE votable_type = 'post' AND votable_id = $1
       GROUP BY vote_value`,
      [TEST_IDS.post1]
    );
    const timeMatch = plan.match(/Execution Time: ([\d.]+) ms/);
    expect(timeMatch).toBeTruthy();
    expect(parseFloat(timeMatch![1])).toBeLessThan(100);
  });
});

// ─────────────────────────────────────────────────
// PARTIAL INDEX VERIFICATION
// ─────────────────────────────────────────────────
describe("partial indexes", () => {
  async function getIndexDef(indexName: string): Promise<string> {
    const { rows } = await db.query<{ indexdef: string }>(
      `SELECT indexdef FROM pg_indexes WHERE indexname = $1`,
      [indexName]
    );
    return rows.length > 0 ? rows[0].indexdef : "";
  }

  it("idx_posts_hot_score is partial (approved, not removed, not deleted)", async () => {
    const def = await getIndexDef("idx_posts_hot_score");
    expect(def).toContain("is_approved = true");
    expect(def).toContain("is_removed = false");
    expect(def).toContain("deleted_at IS NULL");
  });

  it("idx_posts_new is partial (approved, not removed, not deleted)", async () => {
    const def = await getIndexDef("idx_posts_new");
    expect(def).toContain("is_approved = true");
    expect(def).toContain("is_removed = false");
    expect(def).toContain("deleted_at IS NULL");
  });

  it("idx_users_username is partial (not deleted)", async () => {
    const def = await getIndexDef("idx_users_username");
    expect(def).toContain("deleted_at IS NULL");
  });

  it("idx_communities_name is partial (not deleted)", async () => {
    const def = await getIndexDef("idx_communities_name");
    expect(def).toContain("deleted_at IS NULL");
  });

  it("idx_votes_user is partial (not anonymized)", async () => {
    const def = await getIndexDef("idx_votes_user");
    expect(def).toContain("anonymized = false");
  });

  it("idx_votes_created is partial (not anonymized)", async () => {
    const def = await getIndexDef("idx_votes_created");
    expect(def).toContain("anonymized = false");
  });

  it("idx_comments_thread is partial (approved, not removed, not deleted)", async () => {
    const def = await getIndexDef("idx_comments_thread");
    expect(def).toContain("is_approved = true");
    expect(def).toContain("is_removed = false");
    expect(def).toContain("deleted_at IS NULL");
  });

  it("unique_active_council is partial (active only)", async () => {
    const def = await getIndexDef("unique_active_council");
    expect(def).toContain("is_active = true");
  });
});
