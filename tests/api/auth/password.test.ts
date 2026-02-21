import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password utilities", () => {
  it("hashes a password and verifies it", async () => {
    const plain = "securePassword123";
    const hash = await hashPassword(plain);

    expect(hash).not.toBe(plain);
    expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt prefix

    const valid = await verifyPassword(plain, hash);
    expect(valid).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("correctPassword");
    const valid = await verifyPassword("wrongPassword", hash);
    expect(valid).toBe(false);
  });

  it("produces different hashes for same password (salt)", async () => {
    const hash1 = await hashPassword("samePassword");
    const hash2 = await hashPassword("samePassword");
    expect(hash1).not.toBe(hash2);
  });

  it("uses 12 rounds (cost factor)", async () => {
    const hash = await hashPassword("test");
    // bcrypt hash format: $2b$12$...
    expect(hash).toContain("$12$");
  });

  it("handles empty string password", async () => {
    const hash = await hashPassword("");
    expect(hash).toMatch(/^\$2[aby]\$/);
    const valid = await verifyPassword("", hash);
    expect(valid).toBe(true);
  });

  it("handles long passwords", async () => {
    const longPass = "a".repeat(72); // bcrypt max is 72 bytes
    const hash = await hashPassword(longPass);
    const valid = await verifyPassword(longPass, hash);
    expect(valid).toBe(true);
  });
});
