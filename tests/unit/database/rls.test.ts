/**
 * Database RLS (Row-Level Security) Tests
 * Tests access control policies using PGlite with app.user_id session variable.
 *
 * NOTE: PGlite runs as a superuser which bypasses RLS by default.
 * We test RLS by querying pg_policies to verify policy definitions,
 * and by simulating the fuega_app role logic with SET LOCAL.
 * For actual RLS enforcement we verify the policy SQL expressions.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { getTestDb, closeTestDb, TEST_IDS, ALL_TABLES } from "./helpers";

let db: PGlite;

beforeAll(async () => {
  db = await getTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

// ─────────────────────────────────────────────────
// RLS ENABLED ON ALL TABLES
// ─────────────────────────────────────────────────
describe("RLS enabled on all tables", () => {
  it("all 13 tables have RLS enabled", async () => {
    const { rows } = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `SELECT c.relname, c.relrowsecurity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relkind = 'r'
         AND c.relname != '_migrations'
       ORDER BY c.relname`
    );

    const rlsMap = Object.fromEntries(
      rows.map((r) => [r.relname, r.relrowsecurity])
    );

    for (const table of ALL_TABLES) {
      expect(rlsMap[table]).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────
// POLICY DEFINITIONS EXIST
// ─────────────────────────────────────────────────
describe("RLS policy definitions", () => {
  async function getPolicies(
    table: string
  ): Promise<Array<{ policyname: string; cmd: string; qual: string; with_check: string }>> {
    const { rows } = await db.query(
      `SELECT pol.polname as policyname,
              CASE pol.polcmd
                WHEN 'r' THEN 'SELECT'
                WHEN 'a' THEN 'INSERT'
                WHEN 'w' THEN 'UPDATE'
                WHEN 'd' THEN 'DELETE'
                WHEN '*' THEN 'ALL'
              END as cmd,
              pg_get_expr(pol.polqual, pol.polrelid) as qual,
              pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check
       FROM pg_policy pol
       JOIN pg_class c ON c.oid = pol.polrelid
       WHERE c.relname = $1`,
      [table]
    );
    return rows as Array<{
      policyname: string;
      cmd: string;
      qual: string;
      with_check: string;
    }>;
  }

  // --- Users ---
  describe("users policies", () => {
    it("has SELECT policy allowing all", async () => {
      const policies = await getPolicies("users");
      const selectPolicies = policies.filter((p) => p.cmd === "SELECT");
      expect(selectPolicies.length).toBeGreaterThan(0);
      expect(selectPolicies.some((p) => p.qual === "true")).toBe(true);
    });

    it("has UPDATE policy restricted to own user", async () => {
      const policies = await getPolicies("users");
      const updatePolicies = policies.filter((p) => p.cmd === "UPDATE");
      expect(updatePolicies.length).toBeGreaterThan(0);
      expect(
        updatePolicies.some((p) => p.qual?.includes("app.user_id"))
      ).toBe(true);
    });
  });

  // --- Posts ---
  describe("posts policies", () => {
    it("has SELECT policy filtering approved/not-removed or own posts", async () => {
      const policies = await getPolicies("posts");
      const selectPolicies = policies.filter((p) => p.cmd === "SELECT");
      expect(selectPolicies.length).toBeGreaterThan(0);
      // Should reference is_approved and author_id
      expect(
        selectPolicies.some(
          (p) =>
            p.qual?.includes("is_approved") && p.qual?.includes("author_id")
        )
      ).toBe(true);
    });

    it("has INSERT policy restricted to own posts", async () => {
      const policies = await getPolicies("posts");
      const insertPolicies = policies.filter((p) => p.cmd === "INSERT");
      expect(insertPolicies.length).toBeGreaterThan(0);
      expect(
        insertPolicies.some((p) => p.with_check?.includes("app.user_id"))
      ).toBe(true);
    });

    it("has UPDATE policy restricted to own posts", async () => {
      const policies = await getPolicies("posts");
      const updatePolicies = policies.filter((p) => p.cmd === "UPDATE");
      expect(updatePolicies.length).toBeGreaterThan(0);
      expect(
        updatePolicies.some((p) => p.qual?.includes("app.user_id"))
      ).toBe(true);
    });
  });

  // --- Comments ---
  describe("comments policies", () => {
    it("has SELECT policy filtering approved or own comments", async () => {
      const policies = await getPolicies("comments");
      const selectPolicies = policies.filter((p) => p.cmd === "SELECT");
      expect(selectPolicies.length).toBeGreaterThan(0);
      expect(
        selectPolicies.some(
          (p) =>
            p.qual?.includes("is_approved") && p.qual?.includes("author_id")
        )
      ).toBe(true);
    });
  });

  // --- Votes ---
  describe("votes policies", () => {
    it("has SELECT policy restricted to own or anonymized votes", async () => {
      const policies = await getPolicies("votes");
      const selectPolicies = policies.filter((p) => p.cmd === "SELECT");
      expect(selectPolicies.length).toBeGreaterThan(0);
      expect(
        selectPolicies.some(
          (p) =>
            p.qual?.includes("app.user_id") &&
            p.qual?.includes("anonymized")
        )
      ).toBe(true);
    });

    it("has INSERT policy restricted to own votes", async () => {
      const policies = await getPolicies("votes");
      const insertPolicies = policies.filter((p) => p.cmd === "INSERT");
      expect(insertPolicies.length).toBeGreaterThan(0);
      expect(
        insertPolicies.some((p) => p.with_check?.includes("app.user_id"))
      ).toBe(true);
    });

    it("has UPDATE policy that prevents changing anonymized votes", async () => {
      const policies = await getPolicies("votes");
      const updatePolicies = policies.filter((p) => p.cmd === "UPDATE");
      expect(updatePolicies.length).toBeGreaterThan(0);
      expect(
        updatePolicies.some(
          (p) =>
            p.qual?.includes("anonymized") &&
            p.qual?.includes("app.user_id")
        )
      ).toBe(true);
    });
  });

  // --- Proposals ---
  describe("proposals policies", () => {
    it("has public SELECT policy for transparency", async () => {
      const policies = await getPolicies("proposals");
      const selectPolicies = policies.filter((p) => p.cmd === "SELECT");
      expect(selectPolicies.length).toBeGreaterThan(0);
      expect(selectPolicies.some((p) => p.qual === "true")).toBe(true);
    });

    it("has UPDATE policy that only allows editing during discussion", async () => {
      const policies = await getPolicies("proposals");
      const updatePolicies = policies.filter((p) => p.cmd === "UPDATE");
      expect(updatePolicies.length).toBeGreaterThan(0);
      expect(
        updatePolicies.some(
          (p) => p.qual?.includes("discussion") && p.qual?.includes("app.user_id")
        )
      ).toBe(true);
    });
  });

  // --- Proposal Votes ---
  describe("proposal_votes policies", () => {
    it("has SELECT restricted to own votes only", async () => {
      const policies = await getPolicies("proposal_votes");
      const selectPolicies = policies.filter((p) => p.cmd === "SELECT");
      expect(selectPolicies.length).toBeGreaterThan(0);
      expect(
        selectPolicies.some((p) => p.qual?.includes("app.user_id"))
      ).toBe(true);
      // Should NOT be public
      expect(selectPolicies.some((p) => p.qual === "true")).toBe(false);
    });
  });

  // --- Moderation Log ---
  describe("moderation_log policies", () => {
    it("has public SELECT policy (transparency)", async () => {
      const policies = await getPolicies("moderation_log");
      const selectPolicies = policies.filter((p) => p.cmd === "SELECT");
      expect(selectPolicies.length).toBeGreaterThan(0);
      expect(selectPolicies.some((p) => p.qual === "true")).toBe(true);
    });

    it("has NO user-level INSERT policy (system only)", async () => {
      const policies = await getPolicies("moderation_log");
      const insertPolicies = policies.filter((p) => p.cmd === "INSERT");
      // Moderation log inserts are system-only via service role
      expect(insertPolicies.length).toBe(0);
    });
  });

  // --- Moderation Appeals ---
  describe("moderation_appeals policies", () => {
    it("has public SELECT for transparency", async () => {
      const policies = await getPolicies("moderation_appeals");
      const selectPolicies = policies.filter((p) => p.cmd === "SELECT");
      expect(selectPolicies.length).toBeGreaterThan(0);
      expect(selectPolicies.some((p) => p.qual === "true")).toBe(true);
    });

    it("has INSERT restricted to own appeals", async () => {
      const policies = await getPolicies("moderation_appeals");
      const insertPolicies = policies.filter((p) => p.cmd === "INSERT");
      expect(insertPolicies.length).toBeGreaterThan(0);
      expect(
        insertPolicies.some((p) => p.with_check?.includes("app.user_id"))
      ).toBe(true);
    });
  });

  // --- Communities ---
  describe("communities policies", () => {
    it("has SELECT policy filtering soft-deleted communities", async () => {
      const policies = await getPolicies("communities");
      const selectPolicies = policies.filter((p) => p.cmd === "SELECT");
      expect(selectPolicies.length).toBeGreaterThan(0);
      expect(
        selectPolicies.some((p) => p.qual?.includes("deleted_at"))
      ).toBe(true);
    });

    it("has UPDATE policy for creator or admin", async () => {
      const policies = await getPolicies("communities");
      const updatePolicies = policies.filter((p) => p.cmd === "UPDATE");
      expect(updatePolicies.length).toBeGreaterThan(0);
      expect(
        updatePolicies.some(
          (p) =>
            p.qual?.includes("created_by") && p.qual?.includes("admin")
        )
      ).toBe(true);
    });
  });

  // --- Categories ---
  describe("categories policies", () => {
    it("has public SELECT", async () => {
      const policies = await getPolicies("categories");
      const selectPolicies = policies.filter((p) => p.cmd === "SELECT");
      expect(selectPolicies.length).toBeGreaterThan(0);
      expect(selectPolicies.some((p) => p.qual === "true")).toBe(true);
    });

    it("has admin-only INSERT and UPDATE", async () => {
      const policies = await getPolicies("categories");
      const insertPolicies = policies.filter((p) => p.cmd === "INSERT");
      const updatePolicies = policies.filter((p) => p.cmd === "UPDATE");
      expect(
        insertPolicies.some((p) => p.with_check?.includes("admin"))
      ).toBe(true);
      expect(
        updatePolicies.some((p) => p.qual?.includes("admin"))
      ).toBe(true);
    });
  });

  // --- AI Prompt History ---
  describe("ai_prompt_history policies", () => {
    it("has public SELECT for transparency", async () => {
      const policies = await getPolicies("ai_prompt_history");
      const selectPolicies = policies.filter((p) => p.cmd === "SELECT");
      expect(selectPolicies.length).toBeGreaterThan(0);
      expect(selectPolicies.some((p) => p.qual === "true")).toBe(true);
    });
  });

  // --- Council Members ---
  describe("council_members policies", () => {
    it("has public SELECT", async () => {
      const policies = await getPolicies("council_members");
      const selectPolicies = policies.filter((p) => p.cmd === "SELECT");
      expect(selectPolicies.length).toBeGreaterThan(0);
      expect(selectPolicies.some((p) => p.qual === "true")).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────
// ROLE EXISTENCE
// ─────────────────────────────────────────────────
describe("fuega_app role", () => {
  it("fuega_app role exists", async () => {
    const { rows } = await db.query(
      `SELECT 1 FROM pg_roles WHERE rolname = 'fuega_app'`
    );
    expect(rows.length).toBe(1);
  });
});

// ─────────────────────────────────────────────────
// SIMULATED RLS BEHAVIOR (using current_setting)
// ─────────────────────────────────────────────────
describe("simulated RLS behavior", () => {
  it("app.user_id setting works for session context", async () => {
    // set_config with false = session-level (persists outside transaction)
    await db.query(`SELECT set_config('app.user_id', $1, false)`, [
      TEST_IDS.testUser1,
    ]);
    const { rows } = await db.query(
      `SELECT current_setting('app.user_id', true) as uid`
    );
    expect(rows[0].uid).toBe(TEST_IDS.testUser1);
    // Clean up
    await db.query(`SELECT set_config('app.user_id', '', false)`);
  });

  it("app.user_role setting works for admin context", async () => {
    await db.query(`SELECT set_config('app.user_role', 'admin', false)`);
    const { rows } = await db.query(
      `SELECT current_setting('app.user_role', true) as role`
    );
    expect(rows[0].role).toBe("admin");
    // Clean up
    await db.query(`SELECT set_config('app.user_role', '', false)`);
  });

  it("vote anonymization flag exists and defaults to false", async () => {
    // Insert a vote
    await db.query(
      `INSERT INTO votes (id, user_id, votable_type, votable_id, vote_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        "dddddddd-dddd-dddd-dddd-dddddddddd01",
        TEST_IDS.testUser1,
        "post",
        TEST_IDS.post1,
        1,
      ]
    );

    const { rows } = await db.query(
      `SELECT anonymized FROM votes WHERE id = $1`,
      ["dddddddd-dddd-dddd-dddd-dddddddddd01"]
    );
    expect(rows[0].anonymized).toBe(false);

    // After anonymization, the user_id association should be privacy-protected
    await db.query(
      `UPDATE votes SET anonymized = TRUE WHERE id = $1`,
      ["dddddddd-dddd-dddd-dddd-dddddddddd01"]
    );

    const { rows: after } = await db.query(
      `SELECT anonymized FROM votes WHERE id = $1`,
      ["dddddddd-dddd-dddd-dddd-dddddddddd01"]
    );
    expect(after[0].anonymized).toBe(true);

    // Cleanup
    await db.query(`DELETE FROM votes WHERE id = $1`, [
      "dddddddd-dddd-dddd-dddd-dddddddddd01",
    ]);
  });

  it("soft-deleted communities have deleted_at set", async () => {
    // Soft delete a community by setting deleted_at
    await db.query(
      `UPDATE communities SET deleted_at = NOW() WHERE id = $1`,
      [TEST_IDS.communityTestTech]
    );

    const { rows } = await db.query(
      `SELECT deleted_at FROM communities WHERE id = $1`,
      [TEST_IDS.communityTestTech]
    );
    expect(rows[0].deleted_at).toBeTruthy();

    // The RLS policy filters deleted_at IS NULL, so this community
    // would be hidden from regular users (verified via policy definition above)

    // Restore
    await db.query(
      `UPDATE communities SET deleted_at = NULL WHERE id = $1`,
      [TEST_IDS.communityTestTech]
    );
  });
});
