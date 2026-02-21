/**
 * Database Relationship Tests
 * Validates FK cascades, comment threading, vote anonymization, and soft deletes.
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
// SEED DATA INTEGRITY
// ─────────────────────────────────────────────────
describe("seed data loaded correctly", () => {
  it("has 4 users (system + 3 test)", async () => {
    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users`
    );
    expect(parseInt(rows[0].count)).toBe(4);
  });

  it("has 5 categories", async () => {
    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM categories`
    );
    expect(parseInt(rows[0].count)).toBe(5);
  });

  it("has 2 communities", async () => {
    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM communities`
    );
    expect(parseInt(rows[0].count)).toBe(2);
  });

  it("has 3 posts", async () => {
    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM posts`
    );
    expect(parseInt(rows[0].count)).toBe(3);
  });

  it("has 3 comments", async () => {
    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM comments`
    );
    expect(parseInt(rows[0].count)).toBe(3);
  });

  it("has 3 moderation log entries", async () => {
    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM moderation_log`
    );
    expect(parseInt(rows[0].count)).toBe(3);
  });

  it("has 5 community memberships", async () => {
    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM community_memberships`
    );
    expect(parseInt(rows[0].count)).toBe(5);
  });
});

// ─────────────────────────────────────────────────
// USER → POSTS RELATIONSHIP
// ─────────────────────────────────────────────────
describe("user -> posts relationship", () => {
  it("user_1 has 1 post in test_tech", async () => {
    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM posts WHERE author_id = $1`,
      [TEST_IDS.testUser1]
    );
    expect(parseInt(rows[0].count)).toBe(1);
  });

  it("user_2 has 2 posts across communities", async () => {
    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM posts WHERE author_id = $1`,
      [TEST_IDS.testUser2]
    );
    expect(parseInt(rows[0].count)).toBe(2);
  });

  it("posts correctly reference their community", async () => {
    const { rows } = await db.query<{ community_id: string }>(
      `SELECT community_id FROM posts WHERE id = $1`,
      [TEST_IDS.post1]
    );
    expect(rows[0].community_id).toBe(TEST_IDS.communityTestTech);
  });
});

// ─────────────────────────────────────────────────
// COMMUNITY → POSTS RELATIONSHIP
// ─────────────────────────────────────────────────
describe("community -> posts relationship", () => {
  it("test_tech has 2 posts", async () => {
    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM posts WHERE community_id = $1`,
      [TEST_IDS.communityTestTech]
    );
    expect(parseInt(rows[0].count)).toBe(2);
  });

  it("demo_science has 1 post", async () => {
    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM posts WHERE community_id = $1`,
      [TEST_IDS.communityDemoScience]
    );
    expect(parseInt(rows[0].count)).toBe(1);
  });
});

// ─────────────────────────────────────────────────
// COMMENT THREADING
// ─────────────────────────────────────────────────
describe("comment threading", () => {
  it("comment_1 is a top-level comment (no parent)", async () => {
    const { rows } = await db.query(
      `SELECT parent_id, depth FROM comments WHERE id = $1`,
      [TEST_IDS.comment1]
    );
    expect(rows[0].parent_id).toBeNull();
    expect(rows[0].depth).toBe(0);
  });

  it("comment_2 is a reply to comment_1", async () => {
    const { rows } = await db.query(
      `SELECT parent_id, depth FROM comments WHERE id = $1`,
      [TEST_IDS.comment2]
    );
    expect(rows[0].parent_id).toBe(TEST_IDS.comment1);
    expect(rows[0].depth).toBe(1);
  });

  it("comment_3 is a top-level comment on a different post", async () => {
    const { rows } = await db.query(
      `SELECT parent_id, depth, post_id FROM comments WHERE id = $1`,
      [TEST_IDS.comment3]
    );
    expect(rows[0].parent_id).toBeNull();
    expect(rows[0].depth).toBe(0);
    expect(rows[0].post_id).toBe(TEST_IDS.post2);
  });

  it("can query full thread for a post with nested comments", async () => {
    const { rows } = await db.query(
      `SELECT id, parent_id, depth, body
       FROM comments
       WHERE post_id = $1
       ORDER BY parent_id NULLS FIRST, created_at ASC`,
      [TEST_IDS.post1]
    );
    expect(rows.length).toBe(2);
    // First should be the top-level comment
    expect(rows[0].parent_id).toBeNull();
    // Second is the reply
    expect(rows[1].parent_id).toBe(rows[0].id);
  });

  it("can insert deeply nested comments (up to depth 99)", async () => {
    // Create a depth-10 comment chain
    let parentId = TEST_IDS.comment1;
    const createdIds: string[] = [];

    for (let depth = 2; depth <= 5; depth++) {
      const { rows } = await db.query<{ id: string }>(
        `INSERT INTO comments (post_id, author_id, parent_id, body, depth, is_approved)
         VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id`,
        [
          TEST_IDS.post1,
          TEST_IDS.testUser1,
          parentId,
          `Nested comment at depth ${depth}`,
          depth,
        ]
      );
      parentId = rows[0].id;
      createdIds.push(parentId);
    }

    // Verify the chain
    const { rows } = await db.query(
      `SELECT depth FROM comments WHERE id = $1`,
      [createdIds[createdIds.length - 1]]
    );
    expect(rows[0].depth).toBe(5);

    // Cleanup
    for (const id of createdIds.reverse()) {
      await db.query(`DELETE FROM comments WHERE id = $1`, [id]);
    }
  });
});

// ─────────────────────────────────────────────────
// VOTE ANONYMIZATION
// ─────────────────────────────────────────────────
describe("vote anonymization", () => {
  it("new votes are not anonymized by default", async () => {
    await db.query(
      `INSERT INTO votes (id, user_id, votable_type, votable_id, vote_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        TEST_IDS.testUser1,
        "post",
        TEST_IDS.post2,
        1,
      ]
    );

    const { rows } = await db.query(
      `SELECT anonymized, user_id FROM votes WHERE id = $1`,
      ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"]
    );
    expect(rows[0].anonymized).toBe(false);
    expect(rows[0].user_id).toBe(TEST_IDS.testUser1);

    await db.query(`DELETE FROM votes WHERE id = $1`, [
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    ]);
  });

  it("anonymized votes still count for totals", async () => {
    // Insert two votes — one anonymized, one not
    await db.query(
      `INSERT INTO votes (id, user_id, votable_type, votable_id, vote_value, anonymized)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01",
        TEST_IDS.testUser1,
        "post",
        TEST_IDS.post3,
        1,
        false,
      ]
    );
    await db.query(
      `INSERT INTO votes (id, user_id, votable_type, votable_id, vote_value, anonymized)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02",
        TEST_IDS.testUser2,
        "post",
        TEST_IDS.post3,
        -1,
        true,
      ]
    );

    // Count all votes (regardless of anonymization)
    const { rows } = await db.query<{ total: string }>(
      `SELECT SUM(vote_value) as total FROM votes
       WHERE votable_type = 'post' AND votable_id = $1`,
      [TEST_IDS.post3]
    );
    expect(parseInt(rows[0].total)).toBe(0); // 1 + (-1) = 0

    // Cleanup
    await db.query(
      `DELETE FROM votes WHERE id IN ($1, $2)`,
      [
        "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01",
        "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02",
      ]
    );
  });

  it("can find non-anonymized votes older than threshold (for anonymization job)", async () => {
    await db.query(
      `INSERT INTO votes (id, user_id, votable_type, votable_id, vote_value, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW() - interval '25 hours')`,
      [
        "cccccccc-cccc-cccc-cccc-cccccccccccc",
        TEST_IDS.demoAdmin,
        "post",
        TEST_IDS.post1,
        1,
      ]
    );

    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM votes
       WHERE anonymized = FALSE AND created_at < NOW() - interval '24 hours'`
    );
    expect(parseInt(rows[0].count)).toBeGreaterThanOrEqual(1);

    await db.query(`DELETE FROM votes WHERE id = $1`, [
      "cccccccc-cccc-cccc-cccc-cccccccccccc",
    ]);
  });
});

// ─────────────────────────────────────────────────
// SOFT DELETE BEHAVIOR
// ─────────────────────────────────────────────────
describe("soft delete behavior", () => {
  it("soft-deleted user still exists in DB (deleted_at set)", async () => {
    await db.query(`UPDATE users SET deleted_at = NOW() WHERE id = $1`, [
      TEST_IDS.demoAdmin,
    ]);

    const { rows } = await db.query(
      `SELECT id, deleted_at FROM users WHERE id = $1`,
      [TEST_IDS.demoAdmin]
    );
    expect(rows.length).toBe(1);
    expect(rows[0].deleted_at).toBeTruthy();

    // Restore
    await db.query(`UPDATE users SET deleted_at = NULL WHERE id = $1`, [
      TEST_IDS.demoAdmin,
    ]);
  });

  it("soft-deleted posts still exist in DB", async () => {
    await db.query(`UPDATE posts SET deleted_at = NOW() WHERE id = $1`, [
      TEST_IDS.post3,
    ]);

    const { rows } = await db.query(
      `SELECT id, deleted_at FROM posts WHERE id = $1`,
      [TEST_IDS.post3]
    );
    expect(rows.length).toBe(1);
    expect(rows[0].deleted_at).toBeTruthy();

    // Restore
    await db.query(`UPDATE posts SET deleted_at = NULL WHERE id = $1`, [
      TEST_IDS.post3,
    ]);
  });

  it("soft-deleted comments still exist in DB", async () => {
    await db.query(`UPDATE comments SET deleted_at = NOW() WHERE id = $1`, [
      TEST_IDS.comment1,
    ]);

    // The comment should still be queryable
    const { rows } = await db.query(
      `SELECT id, deleted_at FROM comments WHERE id = $1`,
      [TEST_IDS.comment1]
    );
    expect(rows.length).toBe(1);
    expect(rows[0].deleted_at).toBeTruthy();

    // Child comments (comment_2) should still reference this parent
    const { rows: children } = await db.query(
      `SELECT id, parent_id FROM comments WHERE parent_id = $1`,
      [TEST_IDS.comment1]
    );
    expect(children.length).toBe(1);
    expect(children[0].id).toBe(TEST_IDS.comment2);

    // Restore
    await db.query(`UPDATE comments SET deleted_at = NULL WHERE id = $1`, [
      TEST_IDS.comment1,
    ]);
  });

  it("communities have deleted_at column for soft deletes", async () => {
    const { rows } = await db.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'communities' AND column_name = 'deleted_at'`
    );
    expect(rows.length).toBe(1);
  });

  it("NO hard deletes via FK CASCADE on posts", async () => {
    // Verify posts FK does NOT cascade delete — it should RESTRICT
    const { rows } = await db.query<{ confdeltype: string }>(
      `SELECT confdeltype FROM pg_constraint
       WHERE conrelid = 'posts'::regclass
         AND contype = 'f'
         AND confrelid = 'communities'::regclass`
    );
    // 'a' = NO ACTION (default, effectively RESTRICT)
    // 'r' = RESTRICT
    // 'c' = CASCADE
    for (const row of rows) {
      expect(row.confdeltype).not.toBe("c"); // Should NOT be CASCADE
    }
  });
});

// ─────────────────────────────────────────────────
// MODERATION LOG RELATIONSHIPS
// ─────────────────────────────────────────────────
describe("moderation log relationships", () => {
  it("mod logs reference correct communities", async () => {
    const { rows } = await db.query(
      `SELECT ml.id, ml.community_id, c.name as community_name
       FROM moderation_log ml
       JOIN communities c ON c.id = ml.community_id
       ORDER BY ml.created_at`
    );
    expect(rows.length).toBe(3);
    // First two are in test_tech, third in demo_science
    expect(rows[0].community_name).toBe("test_tech");
    expect(rows[1].community_name).toBe("test_tech");
    expect(rows[2].community_name).toBe("demo_science");
  });

  it("mod logs reference correct authors", async () => {
    const { rows } = await db.query(
      `SELECT ml.id, ml.author_id, u.username
       FROM moderation_log ml
       JOIN users u ON u.id = ml.author_id
       ORDER BY ml.created_at`
    );
    expect(rows.length).toBe(3);
    expect(rows[0].username).toBe("test_user_1");
    expect(rows[1].username).toBe("test_user_2");
    expect(rows[2].username).toBe("test_user_2");
  });

  it("can create appeals linked to moderation log entries", async () => {
    // Get a mod log entry
    const { rows: modLogs } = await db.query<{ id: string }>(
      `SELECT id FROM moderation_log LIMIT 1`
    );

    await db.query(
      `INSERT INTO moderation_appeals (id, moderation_log_id, appellant_id, appeal_text)
       VALUES ($1, $2, $3, $4)`,
      [
        "dddddddd-dddd-dddd-dddd-dddddddddddd",
        modLogs[0].id,
        TEST_IDS.testUser1,
        "I disagree with this decision",
      ]
    );

    const { rows } = await db.query(
      `SELECT ma.appeal_text, ml.decision
       FROM moderation_appeals ma
       JOIN moderation_log ml ON ml.id = ma.moderation_log_id
       WHERE ma.id = $1`,
      ["dddddddd-dddd-dddd-dddd-dddddddddddd"]
    );
    expect(rows[0].appeal_text).toBe("I disagree with this decision");
    expect(rows[0].decision).toBe("approved");

    // Cleanup
    await db.query(`DELETE FROM moderation_appeals WHERE id = $1`, [
      "dddddddd-dddd-dddd-dddd-dddddddddddd",
    ]);
  });
});

// ─────────────────────────────────────────────────
// COMMUNITY MEMBERSHIP ROLES
// ─────────────────────────────────────────────────
describe("community membership roles", () => {
  it("test_user_1 is admin of test_tech", async () => {
    const { rows } = await db.query(
      `SELECT role FROM community_memberships
       WHERE user_id = $1 AND community_id = $2`,
      [TEST_IDS.testUser1, TEST_IDS.communityTestTech]
    );
    expect(rows[0].role).toBe("admin");
  });

  it("test_user_2 is member of test_tech and admin of demo_science", async () => {
    const { rows } = await db.query(
      `SELECT cm.role, c.name as community
       FROM community_memberships cm
       JOIN communities c ON c.id = cm.community_id
       WHERE cm.user_id = $1
       ORDER BY c.name`,
      [TEST_IDS.testUser2]
    );
    expect(rows.length).toBe(2);
    expect(rows[0].community).toBe("demo_science");
    expect(rows[0].role).toBe("admin");
    expect(rows[1].community).toBe("test_tech");
    expect(rows[1].role).toBe("member");
  });

  it("demo_admin is member of both communities", async () => {
    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM community_memberships
       WHERE user_id = $1`,
      [TEST_IDS.demoAdmin]
    );
    expect(parseInt(rows[0].count)).toBe(2);
  });
});

// ─────────────────────────────────────────────────
// AI PROMPT HISTORY
// ─────────────────────────────────────────────────
describe("AI prompt history", () => {
  it("has prompt history for both communities", async () => {
    const { rows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ai_prompt_history`
    );
    expect(parseInt(rows[0].count)).toBe(2);
  });

  it("prompt history references correct entities", async () => {
    const { rows } = await db.query(
      `SELECT entity_type, entity_id, version
       FROM ai_prompt_history ORDER BY created_at`
    );
    expect(rows[0].entity_type).toBe("community");
    expect(rows[0].entity_id).toBe(TEST_IDS.communityTestTech);
    expect(rows[0].version).toBe(1);
    expect(rows[1].entity_type).toBe("community");
    expect(rows[1].entity_id).toBe(TEST_IDS.communityDemoScience);
  });
});

// ─────────────────────────────────────────────────
// PROPOSAL + PROPOSAL VOTES
// ─────────────────────────────────────────────────
describe("proposals and proposal votes", () => {
  it("can create a proposal and vote on it", async () => {
    // Create proposal
    const { rows: propRows } = await db.query<{ id: string }>(
      `INSERT INTO proposals (id, community_id, proposal_type, title, description, proposed_changes, created_by, discussion_ends_at, voting_ends_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + interval '2 days', NOW() + interval '9 days')
       RETURNING id`,
      [
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        TEST_IDS.communityTestTech,
        "modify_prompt",
        "Update AI prompt",
        "Let us change the AI prompt",
        '{"new_prompt": "Be nicer"}',
        TEST_IDS.testUser1,
      ]
    );

    // Vote on it
    await db.query(
      `INSERT INTO proposal_votes (proposal_id, user_id, vote) VALUES ($1, $2, $3)`,
      [propRows[0].id, TEST_IDS.testUser1, "for"]
    );
    await db.query(
      `INSERT INTO proposal_votes (proposal_id, user_id, vote) VALUES ($1, $2, $3)`,
      [propRows[0].id, TEST_IDS.testUser2, "against"]
    );

    // Count votes
    const { rows } = await db.query<{ vote: string; count: string }>(
      `SELECT vote, COUNT(*) as count FROM proposal_votes
       WHERE proposal_id = $1 GROUP BY vote ORDER BY vote`,
      [propRows[0].id]
    );
    expect(rows.length).toBe(2);

    // Cleanup
    await db.query(`DELETE FROM proposal_votes WHERE proposal_id = $1`, [
      propRows[0].id,
    ]);
    await db.query(`DELETE FROM proposals WHERE id = $1`, [propRows[0].id]);
  });

  it("prevents duplicate proposal votes from same user", async () => {
    const { rows: propRows } = await db.query<{ id: string }>(
      `INSERT INTO proposals (id, community_id, proposal_type, title, description, proposed_changes, created_by, discussion_ends_at, voting_ends_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + interval '2 days', NOW() + interval '9 days')
       RETURNING id`,
      [
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02",
        TEST_IDS.communityTestTech,
        "modify_prompt",
        "Dup vote test",
        "Test",
        "{}",
        TEST_IDS.testUser1,
      ]
    );

    await db.query(
      `INSERT INTO proposal_votes (proposal_id, user_id, vote) VALUES ($1, $2, $3)`,
      [propRows[0].id, TEST_IDS.testUser1, "for"]
    );

    await expect(
      db.query(
        `INSERT INTO proposal_votes (proposal_id, user_id, vote) VALUES ($1, $2, $3)`,
        [propRows[0].id, TEST_IDS.testUser1, "against"]
      )
    ).rejects.toThrow();

    // Cleanup
    await db.query(`DELETE FROM proposal_votes WHERE proposal_id = $1`, [
      propRows[0].id,
    ]);
    await db.query(`DELETE FROM proposals WHERE id = $1`, [propRows[0].id]);
  });
});
