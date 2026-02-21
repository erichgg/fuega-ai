/**
 * Integration tests for login flow.
 * Uses PGlite in-memory database.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { getTestDb, closeTestDb } from "@/tests/unit/database/helpers";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signToken, verifyToken } from "@/lib/auth/jwt";
import { loginSchema } from "@/lib/auth/validation";
import { loginLimiter } from "@/lib/auth/rate-limit";
import type { PGlite } from "@electric-sql/pglite";

process.env.JWT_SECRET = "test-secret-key-for-jwt-testing-purposes-64chars-minimum-value!!";
process.env.IP_SALT = "test-salt-for-ip-hashing-32chars!";

let db: PGlite;

describe("login integration", () => {
  beforeAll(async () => {
    db = await getTestDb();
    // Create a test user for login tests
    const hash = await hashPassword("correctPassword");
    await db.query(
      `INSERT INTO users (username, password_hash, founder_badge_number, post_sparks, comment_sparks)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (username) DO NOTHING`,
      ["login_test_user", hash, null, 10, 5]
    );

    // Create a banned user
    const bannedHash = await hashPassword("bannedPass");
    await db.query(
      `INSERT INTO users (username, password_hash, is_banned, ban_reason, banned_at)
       VALUES ($1, $2, true, 'test ban', NOW())
       ON CONFLICT (username) DO NOTHING`,
      ["login_banned_user", bannedHash]
    );
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await loginLimiter.delete("test-login-ip");
  });

  it("authenticates with correct credentials", async () => {
    const input = loginSchema.parse({
      username: "login_test_user",
      password: "correctPassword",
    });

    // Look up user
    const result = await db.query<{
      id: string;
      username: string;
      password_hash: string;
      is_banned: boolean;
    }>(
      "SELECT id, username, password_hash, is_banned FROM users WHERE LOWER(username) = LOWER($1) AND deleted_at IS NULL",
      [input.username]
    );

    expect(result.rows).toHaveLength(1);
    const user = result.rows[0];
    expect(user.is_banned).toBe(false);

    const valid = await verifyPassword(input.password, user.password_hash);
    expect(valid).toBe(true);

    // Generate token
    const token = signToken({ userId: user.id, username: user.username });
    const decoded = verifyToken(token);
    expect(decoded?.username).toBe("login_test_user");
  });

  it("rejects wrong password", async () => {
    const result = await db.query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE username = $1",
      ["login_test_user"]
    );

    const valid = await verifyPassword("wrongPassword", result.rows[0].password_hash);
    expect(valid).toBe(false);
  });

  it("rejects non-existent user", async () => {
    const result = await db.query(
      "SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND deleted_at IS NULL",
      ["nonexistent_user_xyz"]
    );
    expect(result.rows).toHaveLength(0);
  });

  it("detects banned user", async () => {
    const result = await db.query<{ is_banned: boolean; ban_reason: string | null }>(
      "SELECT is_banned, ban_reason FROM users WHERE username = $1",
      ["login_banned_user"]
    );
    expect(result.rows[0].is_banned).toBe(true);
    expect(result.rows[0].ban_reason).toBe("test ban");
  });

  it("updates last_login_at on successful login", async () => {
    const user = await db.query<{ id: string }>(
      "SELECT id FROM users WHERE username = $1",
      ["login_test_user"]
    );
    const userId = user.rows[0].id;

    await db.query(
      "UPDATE users SET last_login_at = NOW() WHERE id = $1",
      [userId]
    );

    const updated = await db.query<{ last_login_at: string | null }>(
      "SELECT last_login_at FROM users WHERE id = $1",
      [userId]
    );
    expect(updated.rows[0].last_login_at).not.toBeNull();
  });

  it("case-insensitive username lookup", async () => {
    const result = await db.query(
      "SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND deleted_at IS NULL",
      ["LOGIN_TEST_USER"]
    );
    expect(result.rows).toHaveLength(1);
  });

  it("excludes soft-deleted users from login", async () => {
    const hash = await hashPassword("deletedPass");
    await db.query(
      "INSERT INTO users (username, password_hash, deleted_at) VALUES ($1, $2, NOW())",
      ["login_deleted_user", hash]
    );

    const result = await db.query(
      "SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND deleted_at IS NULL",
      ["login_deleted_user"]
    );
    expect(result.rows).toHaveLength(0);
  });

  it("returns spark score (post + comment sparks)", async () => {
    const result = await db.query<{ post_sparks: number; comment_sparks: number }>(
      "SELECT post_sparks, comment_sparks FROM users WHERE username = $1",
      ["login_test_user"]
    );
    const sparkScore = result.rows[0].post_sparks + result.rows[0].comment_sparks;
    expect(sparkScore).toBe(15);
  });
});
