import { describe, it, expect } from "vitest";
import { signupSchema, loginSchema } from "@/lib/auth/validation";

describe("validation schemas", () => {
  describe("signupSchema", () => {
    it("accepts valid input", () => {
      const result = signupSchema.safeParse({
        username: "valid_user",
        password: "securepass",
      });
      expect(result.success).toBe(true);
    });

    it("accepts input with optional email", () => {
      const result = signupSchema.safeParse({
        username: "valid_user",
        password: "securepass",
        email: "user@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty email string", () => {
      const result = signupSchema.safeParse({
        username: "valid_user",
        password: "securepass",
        email: "",
      });
      expect(result.success).toBe(true);
    });

    it("rejects username shorter than 3 chars", () => {
      const result = signupSchema.safeParse({
        username: "ab",
        password: "securepass",
      });
      expect(result.success).toBe(false);
    });

    it("rejects username longer than 20 chars", () => {
      const result = signupSchema.safeParse({
        username: "a".repeat(21),
        password: "securepass",
      });
      expect(result.success).toBe(false);
    });

    it("rejects username with special characters", () => {
      const result = signupSchema.safeParse({
        username: "user@name",
        password: "securepass",
      });
      expect(result.success).toBe(false);
    });

    it("accepts underscores in username", () => {
      const result = signupSchema.safeParse({
        username: "my_user_1",
        password: "securepass",
      });
      expect(result.success).toBe(true);
    });

    it("rejects password shorter than 8 chars", () => {
      const result = signupSchema.safeParse({
        username: "validuser",
        password: "short",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid email format", () => {
      const result = signupSchema.safeParse({
        username: "validuser",
        password: "securepass",
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });

    it("rejects spaces in username", () => {
      const result = signupSchema.safeParse({
        username: "my user",
        password: "securepass",
      });
      expect(result.success).toBe(false);
    });

    it("rejects hyphens in username", () => {
      const result = signupSchema.safeParse({
        username: "my-user",
        password: "securepass",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("accepts valid input", () => {
      const result = loginSchema.safeParse({
        username: "user",
        password: "pass",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty username", () => {
      const result = loginSchema.safeParse({
        username: "",
        password: "pass",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty password", () => {
      const result = loginSchema.safeParse({
        username: "user",
        password: "",
      });
      expect(result.success).toBe(false);
    });
  });
});
