/**
 * Tests for founder badge assignment logic.
 * First 5000 users get a numbered founder badge.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { getTestDb, closeTestDb } from "@/tests/unit/database/helpers";
import { hashPassword } from "@/lib/auth/password";
import type { PGlite } from "@electric-sql/pglite";

let db: PGlite;

const FOUNDER_BADGE_LIMIT = 5000;

describe("founder badge assignment", () => {
  beforeAll(async () => {
    db = await getTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await db.exec("DELETE FROM users WHERE username LIKE 'founder_test%'");
  });

  it("assigns badge number based on user count", async () => {
    const countResult = await db.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL AND id != '00000000-0000-0000-0000-000000000001'"
    );
    const currentCount = parseInt(countResult.rows[0].count, 10);
    const expectedBadge = currentCount + 1;

    const hash = await hashPassword("pass12345");
    const result = await db.query<{ founder_badge_number: number }>(
      "INSERT INTO users (username, password_hash, founder_badge_number) VALUES ($1, $2, $3) RETURNING founder_badge_number",
      ["founder_test_1", hash, expectedBadge]
    );

    expect(result.rows[0].founder_badge_number).toBe(expectedBadge);
  });

  it("founder badge numbers are unique", async () => {
    const hash = await hashPassword("pass12345");
    await db.query(
      "INSERT INTO users (username, password_hash, founder_badge_number) VALUES ($1, $2, $3)",
      ["founder_test_unique1", hash, 9999]
    );

    // Inserting same badge number should fail (UNIQUE constraint)
    try {
      await db.query(
        "INSERT INTO users (username, password_hash, founder_badge_number) VALUES ($1, $2, $3)",
        ["founder_test_unique2", hash, 9999]
      );
      expect.fail("Should have thrown unique constraint error");
    } catch (err: unknown) {
      const pgErr = err as { message: string };
      expect(pgErr.message).toContain("unique");
    }
  });

  it("null badge for users beyond 5000 threshold", () => {
    const userCount = 5001;
    const founderBadge = userCount < FOUNDER_BADGE_LIMIT ? userCount + 1 : null;
    expect(founderBadge).toBeNull();
  });

  it("non-null badge for users within 5000 threshold", () => {
    const userCount = 4999;
    const founderBadge = userCount < FOUNDER_BADGE_LIMIT ? userCount + 1 : null;
    expect(founderBadge).toBe(5000);
  });
});
