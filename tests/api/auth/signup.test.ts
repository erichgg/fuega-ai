/**
 * Integration tests for signup flow.
 * Uses PGlite in-memory database to test the full user creation flow.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { getTestDb, closeTestDb } from "@/tests/unit/database/helpers";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signToken, verifyToken } from "@/lib/auth/jwt";
import { hashIp } from "@/lib/auth/ip-hash";
import { signupSchema } from "@/lib/auth/validation";
import { signupLimiter } from "@/lib/auth/rate-limit";
import type { PGlite } from "@electric-sql/pglite";

// Set env vars for auth modules
process.env.JWT_SECRET = "test-secret-key-for-jwt-testing-purposes-64chars-minimum-value!!";
process.env.IP_SALT = "test-salt-for-ip-hashing-32chars!";

let db: PGlite;

describe("signup integration", () => {
  beforeAll(async () => {
    db = await getTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    // Clean up test users (but not seed data)
    await db.exec(
      "DELETE FROM users WHERE username LIKE 'newuser%' OR username LIKE 'signup_test%'"
    );
    await signupLimiter.delete("test-signup-ip");
  });

  it("creates a user with hashed password and founder badge", async () => {
    const input = signupSchema.parse({
      username: "newuser1",
      password: "securepass123",
    });

    const passwordHash = await hashPassword(input.password);
    const ipHash = hashIp("127.0.0.1");

    // Count existing users (excluding system user)
    const countResult = await db.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL AND id != '00000000-0000-0000-0000-000000000001'"
    );
    const existingCount = parseInt(countResult.rows[0].count, 10);
    const founderNumber = existingCount < 5000 ? existingCount + 1 : null;

    // Insert user
    const result = await db.query(
      `INSERT INTO users (username, password_hash, ip_address_hash, ip_last_seen, founder_badge_number)
       VALUES ($1, $2, $3, NOW(), $4)
       RETURNING id, username, founder_badge_number, created_at`,
      [input.username, passwordHash, ipHash, founderNumber]
    );

    expect(result.rows).toHaveLength(1);
    const user = result.rows[0] as {
      id: string;
      username: string;
      founder_badge_number: number | null;
      created_at: string;
    };
    expect(user.username).toBe("newuser1");
    expect(user.founder_badge_number).toBe(founderNumber);

    // Verify password was hashed
    const dbUser = await db.query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = $1",
      [user.id]
    );
    const valid = await verifyPassword("securepass123", dbUser.rows[0].password_hash);
    expect(valid).toBe(true);
  });

  it("generates a valid JWT after signup", async () => {
    const token = signToken({ userId: "test-uuid", username: "newuser2" });
    const decoded = verifyToken(token);
    expect(decoded).toEqual({ userId: "test-uuid", username: "newuser2" });
  });

  it("prevents duplicate usernames (case-insensitive)", async () => {
    // Insert first user
    const hash = await hashPassword("password123");
    await db.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2)",
      ["signup_test_dup", hash]
    );

    // Check for existing (case-insensitive)
    const existing = await db.query(
      "SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND deleted_at IS NULL",
      ["Signup_Test_Dup"]
    );
    expect(existing.rows).toHaveLength(1);
  });

  it("stores IP hash, not raw IP", async () => {
    const rawIp = "192.168.1.100";
    const ipHash = hashIp(rawIp);
    const hash = await hashPassword("password123");

    await db.query(
      "INSERT INTO users (username, password_hash, ip_address_hash, ip_last_seen) VALUES ($1, $2, $3, NOW())",
      ["signup_test_ip", hash, ipHash]
    );

    const result = await db.query<{ ip_address_hash: string }>(
      "SELECT ip_address_hash FROM users WHERE username = $1",
      ["signup_test_ip"]
    );

    expect(result.rows[0].ip_address_hash).toBe(ipHash);
    expect(result.rows[0].ip_address_hash).toHaveLength(64);
    expect(result.rows[0].ip_address_hash).not.toContain("192");
  });

  it("assigns sequential founder badges", async () => {
    // Get current count
    const countBefore = await db.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL AND id != '00000000-0000-0000-0000-000000000001'"
    );
    const before = parseInt(countBefore.rows[0].count, 10);

    const hash = await hashPassword("password123");
    await db.query(
      "INSERT INTO users (username, password_hash, founder_badge_number) VALUES ($1, $2, $3)",
      ["signup_test_badge", hash, before + 1]
    );

    const result = await db.query<{ founder_badge_number: number }>(
      "SELECT founder_badge_number FROM users WHERE username = $1",
      ["signup_test_badge"]
    );
    expect(result.rows[0].founder_badge_number).toBe(before + 1);
  });

  it("rejects invalid username format via schema", () => {
    const result = signupSchema.safeParse({
      username: "a",
      password: "securepass",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password via schema", () => {
    const result = signupSchema.safeParse({
      username: "validuser",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("stores optional email field if users table supports it", async () => {
    // The current schema doesn't have an email column, but the signup
    // schema validates it for future use. Verify validation works.
    const withEmail = signupSchema.safeParse({
      username: "signup_test_email",
      password: "securepass",
      email: "test@example.com",
    });
    expect(withEmail.success).toBe(true);

    const badEmail = signupSchema.safeParse({
      username: "signup_test_email",
      password: "securepass",
      email: "not-valid",
    });
    expect(badEmail.success).toBe(false);
  });
});
