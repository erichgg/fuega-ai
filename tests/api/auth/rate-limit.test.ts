import { describe, it, expect, beforeEach } from "vitest";
import {
  checkSignupRateLimit,
  checkLoginRateLimit,
  signupLimiter,
  loginLimiter,
} from "@/lib/auth/rate-limit";

describe("rate limiting", () => {
  beforeEach(async () => {
    // Reset limiters between tests
    await signupLimiter.delete("test-ip-hash");
    await loginLimiter.delete("test-ip-hash");
  });

  describe("signup rate limit", () => {
    it("allows first signup attempt", async () => {
      const result = await checkSignupRateLimit("test-ip-hash");
      expect(result.allowed).toBe(true);
      expect(result.retryAfterSeconds).toBe(0);
    });

    it("blocks second signup attempt (1 per hour)", async () => {
      await checkSignupRateLimit("test-ip-hash");
      const result = await checkSignupRateLimit("test-ip-hash");
      expect(result.allowed).toBe(false);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("allows different IPs independently", async () => {
      await checkSignupRateLimit("ip-hash-1");
      const result = await checkSignupRateLimit("ip-hash-2");
      expect(result.allowed).toBe(true);

      // Cleanup
      await signupLimiter.delete("ip-hash-1");
      await signupLimiter.delete("ip-hash-2");
    });
  });

  describe("login rate limit", () => {
    it("allows first 5 login attempts", async () => {
      for (let i = 0; i < 5; i++) {
        const result = await checkLoginRateLimit("test-ip-hash");
        expect(result.allowed).toBe(true);
      }
    });

    it("blocks 6th login attempt (5 per 15 min)", async () => {
      for (let i = 0; i < 5; i++) {
        await checkLoginRateLimit("test-ip-hash");
      }
      const result = await checkLoginRateLimit("test-ip-hash");
      expect(result.allowed).toBe(false);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("returns retry-after seconds when blocked", async () => {
      for (let i = 0; i < 5; i++) {
        await checkLoginRateLimit("test-ip-hash");
      }
      const result = await checkLoginRateLimit("test-ip-hash");
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(15 * 60);
    });
  });
});
