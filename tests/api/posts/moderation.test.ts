import { describe, it, expect } from "vitest";
import { moderateContent, type ModerationDecision } from "@/lib/moderation/moderate";

describe("moderateContent", () => {
  it("auto-approves normal content in Phase 2", async () => {
    const decision = await moderateContent({
      content_type: "post",
      title: "Hello World",
      body: "This is a normal technology discussion post.",
      community_id: "30000000-0000-0000-0000-000000000001",
      author_id: "20000000-0000-0000-0000-000000000001",
    });

    expect(decision.decision).toBe("approved");
    expect(decision.confidence).toBe(1.0);
    expect(decision.agent_level).toBe("community");
    expect(decision.ai_model).toBe("basic-safety-filter");
    expect(decision.prompt_version).toBe(0);
  });

  it("removes content with extreme safety violations", async () => {
    const decision = await moderateContent({
      content_type: "post",
      title: "Terrible post",
      body: "kill yourself right now",
      community_id: "30000000-0000-0000-0000-000000000001",
      author_id: "20000000-0000-0000-0000-000000000001",
    });

    expect(decision.decision).toBe("removed");
    expect(decision.confidence).toBeGreaterThan(0.9);
    expect(decision.agent_level).toBe("platform");
  });

  it("auto-approves comments in Phase 2", async () => {
    const decision = await moderateContent({
      content_type: "comment",
      body: "Great discussion point! I agree.",
      community_id: "30000000-0000-0000-0000-000000000001",
      author_id: "20000000-0000-0000-0000-000000000002",
    });

    expect(decision.decision).toBe("approved");
    expect(decision.confidence).toBe(1.0);
  });

  it("returns a well-formed ModerationDecision", async () => {
    const decision = await moderateContent({
      content_type: "post",
      title: "Test",
      body: "Normal content",
      community_id: "30000000-0000-0000-0000-000000000001",
      author_id: "20000000-0000-0000-0000-000000000001",
    });

    // Verify all required fields exist
    expect(decision).toHaveProperty("decision");
    expect(decision).toHaveProperty("confidence");
    expect(decision).toHaveProperty("reasoning");
    expect(decision).toHaveProperty("agent_level");
    expect(decision).toHaveProperty("ai_model");
    expect(decision).toHaveProperty("prompt_version");

    // Verify types
    expect(["approved", "removed", "flagged", "warned"]).toContain(decision.decision);
    expect(typeof decision.confidence).toBe("number");
    expect(typeof decision.reasoning).toBe("string");
    expect(["community", "cohort", "category", "platform"]).toContain(decision.agent_level);
  });
});
