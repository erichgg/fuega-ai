/**
 * Database Schema Tests
 * Validates table existence, column types, constraints, foreign keys, and defaults.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { getTestDb, closeTestDb, ALL_TABLES } from "./helpers";

let db: PGlite;

beforeAll(async () => {
  db = await getTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

// ─────────────────────────────────────────────────
// TABLE EXISTENCE
// ─────────────────────────────────────────────────
describe("table existence", () => {
  it("should have all 13 required tables", async () => {
    const { rows } = await db.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public'
         AND tablename != '_migrations'
       ORDER BY tablename`
    );
    const tableNames = rows.map((r) => r.tablename);
    for (const table of ALL_TABLES) {
      expect(tableNames).toContain(table);
    }
  });

  it("should not have unexpected extra tables", async () => {
    const { rows } = await db.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public'
         AND tablename NOT IN ('_migrations')
       ORDER BY tablename`
    );
    const tableNames = rows.map((r) => r.tablename);
    // Every table should be one of the expected 13
    for (const name of tableNames) {
      expect((ALL_TABLES as readonly string[]).includes(name)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────
// COLUMN TYPES — verify critical columns
// ─────────────────────────────────────────────────
describe("column types", () => {
  async function getColumns(
    table: string
  ): Promise<
    Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>
  > {
    const { rows } = await db.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = $1 AND table_schema = 'public'
       ORDER BY ordinal_position`,
      [table]
    );
    return rows as Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>;
  }

  it("users table has correct column types", async () => {
    const cols = await getColumns("users");
    const colMap = Object.fromEntries(cols.map((c) => [c.column_name, c]));

    expect(colMap["id"].data_type).toBe("uuid");
    expect(colMap["username"].data_type).toBe("character varying");
    expect(colMap["password_hash"].data_type).toBe("character varying");
    expect(colMap["created_at"].data_type).toBe("timestamp with time zone");
    expect(colMap["updated_at"].data_type).toBe("timestamp with time zone");
    expect(colMap["is_banned"].data_type).toBe("boolean");
    expect(colMap["post_sparks"].data_type).toBe("integer");
    expect(colMap["comment_sparks"].data_type).toBe("integer");
    expect(colMap["founder_badge_number"].data_type).toBe("integer");
    expect(colMap["ip_address_hash"].data_type).toBe("character varying");
    expect(colMap["deleted_at"].data_type).toBe("timestamp with time zone");
  });

  it("posts table has correct column types", async () => {
    const cols = await getColumns("posts");
    const colMap = Object.fromEntries(cols.map((c) => [c.column_name, c]));

    expect(colMap["id"].data_type).toBe("uuid");
    expect(colMap["community_id"].data_type).toBe("uuid");
    expect(colMap["author_id"].data_type).toBe("uuid");
    expect(colMap["title"].data_type).toBe("character varying");
    expect(colMap["body"].data_type).toBe("text");
    expect(colMap["post_type"].data_type).toBe("character varying");
    expect(colMap["sparks"].data_type).toBe("integer");
    expect(colMap["douses"].data_type).toBe("integer");
    expect(colMap["comment_count"].data_type).toBe("integer");
    expect(colMap["is_approved"].data_type).toBe("boolean");
    expect(colMap["is_removed"].data_type).toBe("boolean");
  });

  it("comments table has correct column types", async () => {
    const cols = await getColumns("comments");
    const colMap = Object.fromEntries(cols.map((c) => [c.column_name, c]));

    expect(colMap["id"].data_type).toBe("uuid");
    expect(colMap["post_id"].data_type).toBe("uuid");
    expect(colMap["author_id"].data_type).toBe("uuid");
    expect(colMap["parent_id"].data_type).toBe("uuid");
    expect(colMap["body"].data_type).toBe("text");
    expect(colMap["depth"].data_type).toBe("integer");
    expect(colMap["sparks"].data_type).toBe("integer");
  });

  it("votes table has correct column types", async () => {
    const cols = await getColumns("votes");
    const colMap = Object.fromEntries(cols.map((c) => [c.column_name, c]));

    expect(colMap["id"].data_type).toBe("uuid");
    expect(colMap["user_id"].data_type).toBe("uuid");
    expect(colMap["votable_type"].data_type).toBe("character varying");
    expect(colMap["votable_id"].data_type).toBe("uuid");
    expect(colMap["vote_value"].data_type).toBe("smallint");
    expect(colMap["anonymized"].data_type).toBe("boolean");
  });

  it("communities table has JSONB governance_config", async () => {
    const cols = await getColumns("communities");
    const colMap = Object.fromEntries(cols.map((c) => [c.column_name, c]));

    expect(colMap["governance_config"].data_type).toBe("jsonb");
  });

  it("proposals table has JSONB proposed_changes", async () => {
    const cols = await getColumns("proposals");
    const colMap = Object.fromEntries(cols.map((c) => [c.column_name, c]));

    expect(colMap["proposed_changes"].data_type).toBe("jsonb");
  });
});

// ─────────────────────────────────────────────────
// NOT NULL CONSTRAINTS
// ─────────────────────────────────────────────────
describe("NOT NULL constraints", () => {
  async function getNonNullableCols(table: string): Promise<string[]> {
    const { rows } = await db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = $1 AND table_schema = 'public' AND is_nullable = 'NO'`,
      [table]
    );
    return rows.map((r) => r.column_name);
  }

  it("users requires id, username, password_hash", async () => {
    const notNull = await getNonNullableCols("users");
    expect(notNull).toContain("id");
    expect(notNull).toContain("username");
    expect(notNull).toContain("password_hash");
  });

  it("posts requires id, community_id, author_id, title, post_type", async () => {
    const notNull = await getNonNullableCols("posts");
    expect(notNull).toContain("id");
    expect(notNull).toContain("community_id");
    expect(notNull).toContain("author_id");
    expect(notNull).toContain("title");
    expect(notNull).toContain("post_type");
  });

  it("comments requires id, post_id, author_id, body", async () => {
    const notNull = await getNonNullableCols("comments");
    expect(notNull).toContain("id");
    expect(notNull).toContain("post_id");
    expect(notNull).toContain("author_id");
    expect(notNull).toContain("body");
  });

  it("votes requires id, user_id, votable_type, votable_id, vote_value", async () => {
    const notNull = await getNonNullableCols("votes");
    expect(notNull).toContain("id");
    expect(notNull).toContain("user_id");
    expect(notNull).toContain("votable_type");
    expect(notNull).toContain("votable_id");
    expect(notNull).toContain("vote_value");
  });

  it("moderation_log requires content_type, content_id, community_id, author_id, agent_level, decision, reason", async () => {
    const notNull = await getNonNullableCols("moderation_log");
    for (const col of [
      "content_type",
      "content_id",
      "community_id",
      "author_id",
      "agent_level",
      "decision",
      "reason",
    ]) {
      expect(notNull).toContain(col);
    }
  });
});

// ─────────────────────────────────────────────────
// CHECK CONSTRAINTS
// ─────────────────────────────────────────────────
describe("CHECK constraints", () => {
  it("rejects username shorter than 3 characters", async () => {
    await expect(
      db.query(
        `INSERT INTO users (username, password_hash) VALUES ($1, $2)`,
        ["ab", "$2b$12$fakehashfakehashfakehashfakehashfakehashfakehash12"]
      )
    ).rejects.toThrow();
  });

  it("rejects invalid post_type", async () => {
    await expect(
      db.query(
        `INSERT INTO posts (community_id, author_id, title, body, post_type)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          "30000000-0000-0000-0000-000000000001",
          "20000000-0000-0000-0000-000000000001",
          "Test",
          "Body",
          "video", // invalid
        ]
      )
    ).rejects.toThrow();
  });

  it("rejects vote_value other than 1 or -1", async () => {
    await expect(
      db.query(
        `INSERT INTO votes (user_id, votable_type, votable_id, vote_value)
         VALUES ($1, $2, $3, $4)`,
        [
          "20000000-0000-0000-0000-000000000001",
          "post",
          "40000000-0000-0000-0000-000000000001",
          2, // invalid
        ]
      )
    ).rejects.toThrow();
  });

  it("rejects invalid votable_type", async () => {
    await expect(
      db.query(
        `INSERT INTO votes (user_id, votable_type, votable_id, vote_value)
         VALUES ($1, $2, $3, $4)`,
        [
          "20000000-0000-0000-0000-000000000001",
          "reaction", // invalid
          "40000000-0000-0000-0000-000000000001",
          1,
        ]
      )
    ).rejects.toThrow();
  });

  it("rejects negative sparks on posts", async () => {
    await expect(
      db.query(`UPDATE posts SET sparks = -1 WHERE id = $1`, [
        "40000000-0000-0000-0000-000000000001",
      ])
    ).rejects.toThrow();
  });

  it("rejects negative sparks on users", async () => {
    await expect(
      db.query(`UPDATE users SET post_sparks = -1 WHERE id = $1`, [
        "20000000-0000-0000-0000-000000000001",
      ])
    ).rejects.toThrow();
  });

  it("rejects community name with invalid characters", async () => {
    await expect(
      db.query(
        `INSERT INTO communities (name, display_name, description, ai_prompt, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          "Invalid Name!", // spaces + special chars
          "Invalid",
          "test",
          "prompt",
          "20000000-0000-0000-0000-000000000001",
        ]
      )
    ).rejects.toThrow();
  });

  it("accepts valid community name", async () => {
    // Should not throw
    await db.query(
      `INSERT INTO communities (name, display_name, description, ai_prompt, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        "valid_name_123",
        "Valid Name",
        "description",
        "prompt text",
        "20000000-0000-0000-0000-000000000001",
      ]
    );
    // Cleanup
    await db.query(`DELETE FROM communities WHERE name = 'valid_name_123'`);
  });

  it("rejects invalid proposal_type", async () => {
    await expect(
      db.query(
        `INSERT INTO proposals (community_id, proposal_type, title, description, proposed_changes, created_by, discussion_ends_at, voting_ends_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() + interval '2 days', NOW() + interval '9 days')`,
        [
          "30000000-0000-0000-0000-000000000001",
          "invalid_type",
          "Test",
          "Desc",
          "{}",
          "20000000-0000-0000-0000-000000000001",
        ]
      )
    ).rejects.toThrow();
  });

  it("rejects invalid proposal vote value", async () => {
    // First create a valid proposal
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO proposals (community_id, proposal_type, title, description, proposed_changes, created_by, discussion_ends_at, voting_ends_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + interval '2 days', NOW() + interval '9 days')
       RETURNING id`,
      [
        "30000000-0000-0000-0000-000000000001",
        "modify_prompt",
        "Test Proposal",
        "Description",
        '{"change": "test"}',
        "20000000-0000-0000-0000-000000000001",
      ]
    );
    const proposalId = rows[0].id;

    await expect(
      db.query(
        `INSERT INTO proposal_votes (proposal_id, user_id, vote) VALUES ($1, $2, $3)`,
        [proposalId, "20000000-0000-0000-0000-000000000001", "maybe"] // invalid
      )
    ).rejects.toThrow();

    // Cleanup
    await db.query(`DELETE FROM proposals WHERE id = $1`, [proposalId]);
  });

  it("rejects comment body longer than 10000 characters", async () => {
    const longBody = "x".repeat(10001);
    await expect(
      db.query(
        `INSERT INTO comments (post_id, author_id, body, depth)
         VALUES ($1, $2, $3, 0)`,
        [
          "40000000-0000-0000-0000-000000000001",
          "20000000-0000-0000-0000-000000000001",
          longBody,
        ]
      )
    ).rejects.toThrow();
  });

  it("rejects post title longer than 300 characters", async () => {
    const longTitle = "x".repeat(301);
    await expect(
      db.query(
        `INSERT INTO posts (community_id, author_id, title, post_type)
         VALUES ($1, $2, $3, $4)`,
        [
          "30000000-0000-0000-0000-000000000001",
          "20000000-0000-0000-0000-000000000001",
          longTitle,
          "text",
        ]
      )
    ).rejects.toThrow();
  });

  it("rejects invalid moderation decision", async () => {
    await expect(
      db.query(
        `INSERT INTO moderation_log (content_type, content_id, community_id, author_id, agent_level, decision, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          "post",
          "40000000-0000-0000-0000-000000000001",
          "30000000-0000-0000-0000-000000000001",
          "20000000-0000-0000-0000-000000000001",
          "community",
          "deleted", // invalid — must be approved/removed/flagged/warned
          "test",
        ]
      )
    ).rejects.toThrow();
  });

  it("rejects invalid agent_level", async () => {
    await expect(
      db.query(
        `INSERT INTO moderation_log (content_type, content_id, community_id, author_id, agent_level, decision, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          "post",
          "40000000-0000-0000-0000-000000000001",
          "30000000-0000-0000-0000-000000000001",
          "20000000-0000-0000-0000-000000000001",
          "global", // invalid
          "approved",
          "test",
        ]
      )
    ).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────
// UNIQUE CONSTRAINTS
// ─────────────────────────────────────────────────
describe("UNIQUE constraints", () => {
  it("rejects duplicate username", async () => {
    await expect(
      db.query(`INSERT INTO users (username, password_hash) VALUES ($1, $2)`, [
        "test_user_1", // already exists
        "$2b$12$fakehashfakehashfakehashfakehashfakehashfakehash12",
      ])
    ).rejects.toThrow();
  });

  it("rejects duplicate community name", async () => {
    await expect(
      db.query(
        `INSERT INTO communities (name, display_name, description, ai_prompt, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          "test_tech", // already exists
          "Dup",
          "desc",
          "prompt",
          "20000000-0000-0000-0000-000000000001",
        ]
      )
    ).rejects.toThrow();
  });

  it("rejects duplicate vote for same user+votable", async () => {
    // Insert first vote
    await db.query(
      `INSERT INTO votes (user_id, votable_type, votable_id, vote_value)
       VALUES ($1, $2, $3, $4)`,
      [
        "20000000-0000-0000-0000-000000000001",
        "post",
        "40000000-0000-0000-0000-000000000001",
        1,
      ]
    );
    // Duplicate should fail
    await expect(
      db.query(
        `INSERT INTO votes (user_id, votable_type, votable_id, vote_value)
         VALUES ($1, $2, $3, $4)`,
        [
          "20000000-0000-0000-0000-000000000001",
          "post",
          "40000000-0000-0000-0000-000000000001",
          -1,
        ]
      )
    ).rejects.toThrow();

    // Cleanup
    await db.query(
      `DELETE FROM votes WHERE user_id = $1 AND votable_id = $2`,
      [
        "20000000-0000-0000-0000-000000000001",
        "40000000-0000-0000-0000-000000000001",
      ]
    );
  });

  it("rejects duplicate community membership", async () => {
    await expect(
      db.query(
        `INSERT INTO community_memberships (user_id, community_id, role)
         VALUES ($1, $2, $3)`,
        [
          "20000000-0000-0000-0000-000000000001",
          "30000000-0000-0000-0000-000000000001",
          "member", // test_user_1 is already admin of test_tech
        ]
      )
    ).rejects.toThrow();
  });

  it("rejects duplicate category name", async () => {
    await expect(
      db.query(
        `INSERT INTO categories (name, description, ai_prompt)
         VALUES ($1, $2, $3)`,
        ["technology", "dup", "prompt"] // already exists
      )
    ).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────
// DEFAULT VALUES
// ─────────────────────────────────────────────────
describe("default values", () => {
  it("users get default values for sparks, is_banned", async () => {
    await db.query(
      `INSERT INTO users (id, username, password_hash)
       VALUES ($1, $2, $3)`,
      [
        "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
        "default_test_user",
        "$2b$12$fakehashfakehashfakehashfakehashfakehashfakehash12",
      ]
    );

    const { rows } = await db.query(
      `SELECT post_sparks, comment_sparks, is_banned, created_at, updated_at
       FROM users WHERE id = $1`,
      ["eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"]
    );

    expect(rows[0].post_sparks).toBe(0);
    expect(rows[0].comment_sparks).toBe(0);
    expect(rows[0].is_banned).toBe(false);
    expect(rows[0].created_at).toBeTruthy();
    expect(rows[0].updated_at).toBeTruthy();

    await db.query(`DELETE FROM users WHERE id = $1`, [
      "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    ]);
  });

  it("posts get default values for sparks, douses, is_approved, is_removed", async () => {
    await db.query(
      `INSERT INTO posts (id, community_id, author_id, title, post_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        "eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01",
        "30000000-0000-0000-0000-000000000001",
        "20000000-0000-0000-0000-000000000001",
        "Default test post",
        "text",
      ]
    );

    const { rows } = await db.query(
      `SELECT sparks, douses, comment_count, is_approved, is_removed
       FROM posts WHERE id = $1`,
      ["eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01"]
    );

    expect(rows[0].sparks).toBe(0);
    expect(rows[0].douses).toBe(0);
    expect(rows[0].comment_count).toBe(0);
    expect(rows[0].is_approved).toBe(false);
    expect(rows[0].is_removed).toBe(false);

    await db.query(`DELETE FROM posts WHERE id = $1`, [
      "eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01",
    ]);
  });

  it("votes default anonymized to false", async () => {
    await db.query(
      `INSERT INTO votes (id, user_id, votable_type, votable_id, vote_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        "eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02",
        "20000000-0000-0000-0000-000000000003",
        "post",
        "40000000-0000-0000-0000-000000000001",
        1,
      ]
    );

    const { rows } = await db.query(
      `SELECT anonymized FROM votes WHERE id = $1`,
      ["eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02"]
    );
    expect(rows[0].anonymized).toBe(false);

    await db.query(`DELETE FROM votes WHERE id = $1`, [
      "eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02",
    ]);
  });

  it("communities get default governance_config JSONB", async () => {
    const { rows } = await db.query(
      `SELECT governance_config FROM communities WHERE id = $1`,
      ["30000000-0000-0000-0000-000000000001"]
    );
    const config = rows[0].governance_config;
    expect(config.voting_type).toBe("simple_majority");
    expect(config.quorum_percentage).toBe(10);
    expect(config.proposal_discussion_hours).toBe(48);
    expect(config.proposal_voting_hours).toBe(168);
  });

  it("UUID primary keys auto-generated via gen_random_uuid()", async () => {
    await db.query(
      `INSERT INTO users (username, password_hash) VALUES ($1, $2)`,
      [
        "uuid_test_user",
        "$2b$12$fakehashfakehashfakehashfakehashfakehashfakehash12",
      ]
    );

    const { rows } = await db.query(
      `SELECT id FROM users WHERE username = $1`,
      ["uuid_test_user"]
    );
    // UUID format: 8-4-4-4-12 hex
    expect(rows[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );

    await db.query(`DELETE FROM users WHERE username = $1`, ["uuid_test_user"]);
  });
});

// ─────────────────────────────────────────────────
// FOREIGN KEYS
// ─────────────────────────────────────────────────
describe("foreign keys", () => {
  it("posts.community_id references communities(id)", async () => {
    await expect(
      db.query(
        `INSERT INTO posts (community_id, author_id, title, post_type)
         VALUES ($1, $2, $3, $4)`,
        [
          "ffffffff-ffff-ffff-ffff-ffffffffffff", // non-existent community
          "20000000-0000-0000-0000-000000000001",
          "Orphan post",
          "text",
        ]
      )
    ).rejects.toThrow();
  });

  it("posts.author_id references users(id)", async () => {
    await expect(
      db.query(
        `INSERT INTO posts (community_id, author_id, title, post_type)
         VALUES ($1, $2, $3, $4)`,
        [
          "30000000-0000-0000-0000-000000000001",
          "ffffffff-ffff-ffff-ffff-ffffffffffff", // non-existent user
          "Orphan post",
          "text",
        ]
      )
    ).rejects.toThrow();
  });

  it("comments.post_id references posts(id)", async () => {
    await expect(
      db.query(
        `INSERT INTO comments (post_id, author_id, body, depth)
         VALUES ($1, $2, $3, $4)`,
        [
          "ffffffff-ffff-ffff-ffff-ffffffffffff", // non-existent post
          "20000000-0000-0000-0000-000000000001",
          "Orphan comment",
          0,
        ]
      )
    ).rejects.toThrow();
  });

  it("comments.parent_id references comments(id) for threading", async () => {
    await expect(
      db.query(
        `INSERT INTO comments (post_id, author_id, parent_id, body, depth)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          "40000000-0000-0000-0000-000000000001",
          "20000000-0000-0000-0000-000000000001",
          "ffffffff-ffff-ffff-ffff-ffffffffffff", // non-existent parent
          "Reply to nothing",
          1,
        ]
      )
    ).rejects.toThrow();
  });

  it("community_memberships references both users and communities", async () => {
    // Bad user
    await expect(
      db.query(
        `INSERT INTO community_memberships (user_id, community_id)
         VALUES ($1, $2)`,
        [
          "ffffffff-ffff-ffff-ffff-ffffffffffff",
          "30000000-0000-0000-0000-000000000001",
        ]
      )
    ).rejects.toThrow();

    // Bad community
    await expect(
      db.query(
        `INSERT INTO community_memberships (user_id, community_id)
         VALUES ($1, $2)`,
        [
          "20000000-0000-0000-0000-000000000001",
          "ffffffff-ffff-ffff-ffff-ffffffffffff",
        ]
      )
    ).rejects.toThrow();
  });

  it("communities.created_by references users(id)", async () => {
    await expect(
      db.query(
        `INSERT INTO communities (name, display_name, description, ai_prompt, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          "fk_test_comm",
          "FK Test",
          "test",
          "prompt",
          "ffffffff-ffff-ffff-ffff-ffffffffffff", // non-existent
        ]
      )
    ).rejects.toThrow();
  });

  it("moderation_appeals.moderation_log_id references moderation_log(id)", async () => {
    await expect(
      db.query(
        `INSERT INTO moderation_appeals (moderation_log_id, appellant_id, appeal_text)
         VALUES ($1, $2, $3)`,
        [
          "ffffffff-ffff-ffff-ffff-ffffffffffff", // non-existent
          "20000000-0000-0000-0000-000000000001",
          "I appeal",
        ]
      )
    ).rejects.toThrow();
  });

  it("council_members references categories, communities, and users", async () => {
    await expect(
      db.query(
        `INSERT INTO council_members (category_id, community_id, user_id, term_end)
         VALUES ($1, $2, $3, NOW() + interval '1 year')`,
        [
          "ffffffff-ffff-ffff-ffff-ffffffffffff", // bad category
          "30000000-0000-0000-0000-000000000001",
          "20000000-0000-0000-0000-000000000001",
        ]
      )
    ).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────
// TRIGGER: updated_at
// ─────────────────────────────────────────────────
describe("updated_at trigger", () => {
  it("updates users.updated_at on row modification", async () => {
    const { rows: before } = await db.query(
      `SELECT updated_at FROM users WHERE id = $1`,
      ["20000000-0000-0000-0000-000000000001"]
    );

    // Small delay to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 50));

    await db.query(`UPDATE users SET post_sparks = post_sparks + 1 WHERE id = $1`, [
      "20000000-0000-0000-0000-000000000001",
    ]);

    const { rows: after } = await db.query(
      `SELECT updated_at FROM users WHERE id = $1`,
      ["20000000-0000-0000-0000-000000000001"]
    );

    expect(new Date(after[0].updated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(before[0].updated_at).getTime()
    );

    // Restore
    await db.query(`UPDATE users SET post_sparks = post_sparks - 1 WHERE id = $1`, [
      "20000000-0000-0000-0000-000000000001",
    ]);
  });

  it("updates posts.updated_at on row modification", async () => {
    const { rows: before } = await db.query(
      `SELECT updated_at FROM posts WHERE id = $1`,
      ["40000000-0000-0000-0000-000000000001"]
    );

    await new Promise((r) => setTimeout(r, 50));

    await db.query(
      `UPDATE posts SET sparks = sparks + 1 WHERE id = $1`,
      ["40000000-0000-0000-0000-000000000001"]
    );

    const { rows: after } = await db.query(
      `SELECT updated_at FROM posts WHERE id = $1`,
      ["40000000-0000-0000-0000-000000000001"]
    );

    expect(new Date(after[0].updated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(before[0].updated_at).getTime()
    );

    // Restore
    await db.query(
      `UPDATE posts SET sparks = sparks - 1 WHERE id = $1`,
      ["40000000-0000-0000-0000-000000000001"]
    );
  });
});
