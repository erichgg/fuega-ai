import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

// Mock next/headers since we're not in a Next.js runtime
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(),
      set: vi.fn(),
    })
  ),
}));

// Set env before importing module
const TEST_SECRET = "test-secret-key-for-jwt-testing-purposes-64chars-minimum-value!!";
process.env.JWT_SECRET = TEST_SECRET;

import {
  signToken,
  verifyToken,
  getAuthFromHeader,
  type JwtPayload,
} from "@/lib/auth/jwt";

describe("JWT utilities", () => {
  const testPayload: JwtPayload = {
    userId: "550e8400-e29b-41d4-a716-446655440000",
    username: "testuser",
  };

  describe("signToken", () => {
    it("creates a valid JWT", () => {
      const token = signToken(testPayload);
      expect(token).toBeTruthy();
      expect(token.split(".")).toHaveLength(3); // header.payload.signature

      const decoded = jwt.verify(token, TEST_SECRET) as jwt.JwtPayload;
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.username).toBe(testPayload.username);
    });

    it("includes expiry", () => {
      const token = signToken(testPayload);
      const decoded = jwt.decode(token) as jwt.JwtPayload;
      expect(decoded.exp).toBeDefined();
      // 7 days expiry
      const sevenDaysSeconds = 7 * 24 * 60 * 60;
      const expiresIn = decoded.exp! - decoded.iat!;
      expect(expiresIn).toBe(sevenDaysSeconds);
    });
  });

  describe("verifyToken", () => {
    it("returns payload for valid token", () => {
      const token = signToken(testPayload);
      const result = verifyToken(token);
      expect(result).toEqual(testPayload);
    });

    it("returns null for invalid token", () => {
      const result = verifyToken("invalid.token.here");
      expect(result).toBeNull();
    });

    it("returns null for expired token", () => {
      const token = jwt.sign(testPayload, TEST_SECRET, { expiresIn: "-1s" });
      const result = verifyToken(token);
      expect(result).toBeNull();
    });

    it("returns null for token signed with wrong secret", () => {
      const token = jwt.sign(testPayload, "wrong-secret");
      const result = verifyToken(token);
      expect(result).toBeNull();
    });

    it("returns null for empty string", () => {
      const result = verifyToken("");
      expect(result).toBeNull();
    });
  });

  describe("getAuthFromHeader", () => {
    it("extracts token from Bearer header", () => {
      const token = signToken(testPayload);
      const req = new Request("http://localhost", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = getAuthFromHeader(req);
      expect(result).toEqual(testPayload);
    });

    it("returns null without Authorization header", () => {
      const req = new Request("http://localhost");
      const result = getAuthFromHeader(req);
      expect(result).toBeNull();
    });

    it("returns null for non-Bearer auth", () => {
      const req = new Request("http://localhost", {
        headers: { Authorization: "Basic dXNlcjpwYXNz" },
      });
      const result = getAuthFromHeader(req);
      expect(result).toBeNull();
    });

    it("returns null for invalid Bearer token", () => {
      const req = new Request("http://localhost", {
        headers: { Authorization: "Bearer invalid-token" },
      });
      const result = getAuthFromHeader(req);
      expect(result).toBeNull();
    });
  });
});
