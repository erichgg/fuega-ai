import { describe, it, expect } from "vitest";

describe("smoke test", () => {
  it("verifies test framework is working", () => {
    expect(1 + 1).toBe(2);
  });

  it("verifies TypeScript strict mode types", () => {
    const value: string = "fuega";
    expect(value).toBe("fuega");
  });
});
