import { describe, it, expect, beforeAll } from "vitest";

// Set env before importing module
process.env.IP_SALT = "test-salt-for-ip-hashing-32chars!";

import { hashIp, getClientIp } from "@/lib/auth/ip-hash";

describe("IP hashing", () => {
  describe("hashIp", () => {
    it("returns a SHA-256 hex string (64 chars)", () => {
      const hash = hashIp("192.168.1.1");
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("produces consistent hashes for same IP", () => {
      const hash1 = hashIp("10.0.0.1");
      const hash2 = hashIp("10.0.0.1");
      expect(hash1).toBe(hash2);
    });

    it("produces different hashes for different IPs", () => {
      const hash1 = hashIp("10.0.0.1");
      const hash2 = hashIp("10.0.0.2");
      expect(hash1).not.toBe(hash2);
    });

    it("hashes IPv6 addresses", () => {
      const hash = hashIp("::1");
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("raw IP is not present in hash", () => {
      const ip = "192.168.1.100";
      const hash = hashIp(ip);
      expect(hash).not.toContain("192");
      expect(hash).not.toContain("168");
    });
  });

  describe("getClientIp", () => {
    it("extracts from cf-connecting-ip (Cloudflare)", () => {
      const req = new Request("http://localhost", {
        headers: { "cf-connecting-ip": "1.2.3.4" },
      });
      expect(getClientIp(req)).toBe("1.2.3.4");
    });

    it("extracts from x-forwarded-for (first IP)", () => {
      const req = new Request("http://localhost", {
        headers: { "x-forwarded-for": "5.6.7.8, 10.0.0.1, 10.0.0.2" },
      });
      expect(getClientIp(req)).toBe("5.6.7.8");
    });

    it("extracts from x-real-ip", () => {
      const req = new Request("http://localhost", {
        headers: { "x-real-ip": "9.10.11.12" },
      });
      expect(getClientIp(req)).toBe("9.10.11.12");
    });

    it("prefers cf-connecting-ip over x-forwarded-for", () => {
      const req = new Request("http://localhost", {
        headers: {
          "cf-connecting-ip": "1.1.1.1",
          "x-forwarded-for": "2.2.2.2",
        },
      });
      expect(getClientIp(req)).toBe("1.1.1.1");
    });

    it("falls back to 0.0.0.0 when no headers present", () => {
      const req = new Request("http://localhost");
      expect(getClientIp(req)).toBe("0.0.0.0");
    });
  });
});
