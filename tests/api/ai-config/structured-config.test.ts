import { describe, it, expect } from "vitest";
import {
  validateConfig,
  validateAndMergeConfig,
  buildPromptFromConfig,
  DEFAULT_AI_CONFIG,
  PLATFORM_RULES,
  type CampfireAIConfig,
} from "@/lib/ai/structured-config";
import { getAllFeatureFlags, isFeatureEnabled } from "@/lib/feature-flags";

// ---------------------------------------------------------------------------
// Validation Tests
// ---------------------------------------------------------------------------

describe("validateConfig", () => {
  it("accepts default config", () => {
    const result = validateConfig(DEFAULT_AI_CONFIG);
    expect(result.valid).toBe(true);
    expect(result.config).toEqual(DEFAULT_AI_CONFIG);
  });

  it("accepts valid custom config", () => {
    const config: CampfireAIConfig = {
      toxicity_threshold: 70,
      spam_sensitivity: "high",
      self_promotion_policy: "block",
      link_sharing_policy: "flag",
      allowed_post_types: ["text", "link"],
      allow_nsfw: false,
      language_requirements: ["en", "es"],
      require_english: true,
      minimum_account_age_days: 30,
      minimum_glow: 100,
      blocked_keywords: ["spam_word"],
      flagged_keywords: ["borderline"],
      config_change_quorum: 15,
      config_change_threshold: 66,
      config_change_voting_days: 14,
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.config).toEqual(config);
  });

  // --- Guardrail enforcement ---

  it("rejects toxicity_threshold > 90", () => {
    const config = { ...DEFAULT_AI_CONFIG, toxicity_threshold: 91 };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors?.[0]).toMatch(/90/);
  });

  it("rejects toxicity_threshold > 100", () => {
    const config = { ...DEFAULT_AI_CONFIG, toxicity_threshold: 100 };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
  });

  it("rejects negative toxicity_threshold", () => {
    const config = { ...DEFAULT_AI_CONFIG, toxicity_threshold: -1 };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
  });

  it("accepts toxicity_threshold of 0", () => {
    const config = { ...DEFAULT_AI_CONFIG, toxicity_threshold: 0 };
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it("accepts toxicity_threshold of 90", () => {
    const config = { ...DEFAULT_AI_CONFIG, toxicity_threshold: 90 };
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it("rejects quorum < 5", () => {
    const config = { ...DEFAULT_AI_CONFIG, config_change_quorum: 4 };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors?.[0]).toMatch(/5%/);
  });

  it("rejects threshold < 51", () => {
    const config = { ...DEFAULT_AI_CONFIG, config_change_threshold: 50 };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors?.[0]).toMatch(/51%/);
  });

  it("rejects empty allowed_post_types", () => {
    const config = { ...DEFAULT_AI_CONFIG, allowed_post_types: [] as CampfireAIConfig["allowed_post_types"] };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors?.[0]).toMatch(/at least one/i);
  });

  it("rejects more than 100 blocked keywords", () => {
    const config = {
      ...DEFAULT_AI_CONFIG,
      blocked_keywords: Array.from({ length: 101 }, (_, i) => `word${i}`),
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
  });

  it("rejects more than 100 flagged keywords", () => {
    const config = {
      ...DEFAULT_AI_CONFIG,
      flagged_keywords: Array.from({ length: 101 }, (_, i) => `word${i}`),
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
  });

  it("rejects combined keywords > 200", () => {
    const config = {
      ...DEFAULT_AI_CONFIG,
      blocked_keywords: Array.from({ length: 100 }, (_, i) => `blocked${i}`),
      flagged_keywords: Array.from({ length: 101 }, (_, i) => `flagged${i}`),
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
  });

  it("accepts combined keywords = 200", () => {
    const config = {
      ...DEFAULT_AI_CONFIG,
      blocked_keywords: Array.from({ length: 100 }, (_, i) => `blocked${i}`),
      flagged_keywords: Array.from({ length: 100 }, (_, i) => `flagged${i}`),
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it("rejects minimum_account_age_days > 365", () => {
    const config = { ...DEFAULT_AI_CONFIG, minimum_account_age_days: 366 };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
  });

  it("rejects minimum_spark_score > 10000", () => {
    const config = { ...DEFAULT_AI_CONFIG, minimum_spark_score: 10001 };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
  });

  it("rejects invalid language codes", () => {
    const config = { ...DEFAULT_AI_CONFIG, language_requirements: ["english"] };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
  });

  it("accepts valid ISO 639-1 codes", () => {
    const config = { ...DEFAULT_AI_CONFIG, language_requirements: ["en", "fr", "de"] };
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it("rejects duplicate post types", () => {
    const config = {
      ...DEFAULT_AI_CONFIG,
      allowed_post_types: ["text", "text"] as CampfireAIConfig["allowed_post_types"],
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
  });

  it("rejects invalid spam_sensitivity", () => {
    const config = { ...DEFAULT_AI_CONFIG, spam_sensitivity: "extreme" };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
  });

  it("rejects voting_days > 30", () => {
    const config = { ...DEFAULT_AI_CONFIG, config_change_voting_days: 31 };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
  });

  it("rejects voting_days < 1", () => {
    const config = { ...DEFAULT_AI_CONFIG, config_change_voting_days: 0 };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Merge Validation Tests
// ---------------------------------------------------------------------------

describe("validateAndMergeConfig", () => {
  it("merges partial changes with existing config", () => {
    const result = validateAndMergeConfig(DEFAULT_AI_CONFIG, {
      toxicity_threshold: 70,
      spam_sensitivity: "high",
    });

    expect(result.valid).toBe(true);
    expect(result.config?.toxicity_threshold).toBe(70);
    expect(result.config?.spam_sensitivity).toBe("high");
    // Unchanged fields preserved
    expect(result.config?.self_promotion_policy).toBe(DEFAULT_AI_CONFIG.self_promotion_policy);
  });

  it("rejects partial changes that violate guardrails", () => {
    const result = validateAndMergeConfig(DEFAULT_AI_CONFIG, {
      toxicity_threshold: 95,
    });
    expect(result.valid).toBe(false);
  });

  it("accepts empty changes (no-op)", () => {
    const result = validateAndMergeConfig(DEFAULT_AI_CONFIG, {});
    expect(result.valid).toBe(true);
    expect(result.config).toEqual(DEFAULT_AI_CONFIG);
  });

  it("ignores unknown fields in partial update (stripped by schema)", () => {
    const result = validateAndMergeConfig(DEFAULT_AI_CONFIG, {
      nonexistent_field: "value",
    });
    // Zod strips unknown fields — the merged result equals the original
    expect(result.valid).toBe(true);
    expect(result.config).toEqual(DEFAULT_AI_CONFIG);
  });
});

// ---------------------------------------------------------------------------
// Prompt Generation Tests
// ---------------------------------------------------------------------------

describe("buildPromptFromConfig", () => {
  it("generates a prompt from default config", () => {
    const prompt = buildPromptFromConfig("technology", DEFAULT_AI_CONFIG);

    expect(prompt).toContain("f/technology");
    expect(prompt).toContain("moderation agent");
    expect(prompt).toContain("CONTENT POLICY:");
    expect(prompt).toContain("ALLOWED CONTENT TYPES:");
    expect(prompt).toContain("PLATFORM RULES");
    expect(prompt).toContain("JSON decision");
  });

  it("always includes platform rules", () => {
    const prompt = buildPromptFromConfig("test", DEFAULT_AI_CONFIG);

    for (const rule of PLATFORM_RULES) {
      expect(prompt).toContain(rule);
    }
  });

  it("includes NSFW restriction when disabled", () => {
    const config = { ...DEFAULT_AI_CONFIG, allow_nsfw: false };
    const prompt = buildPromptFromConfig("test", config);
    expect(prompt).toContain("NOT ALLOWED");
  });

  it("allows NSFW when enabled", () => {
    const config = { ...DEFAULT_AI_CONFIG, allow_nsfw: true };
    const prompt = buildPromptFromConfig("test", config);
    expect(prompt).toContain("Allowed");
    expect(prompt).toContain("NSFW content is permitted");
  });

  it("includes blocked keywords", () => {
    const config = {
      ...DEFAULT_AI_CONFIG,
      blocked_keywords: ["spam_term", "bad_word"],
    };
    const prompt = buildPromptFromConfig("test", config);
    expect(prompt).toContain("BLOCKED KEYWORDS");
    expect(prompt).toContain("spam_term");
    expect(prompt).toContain("bad_word");
  });

  it("includes flagged keywords", () => {
    const config = {
      ...DEFAULT_AI_CONFIG,
      flagged_keywords: ["borderline"],
    };
    const prompt = buildPromptFromConfig("test", config);
    expect(prompt).toContain("FLAGGED KEYWORDS");
    expect(prompt).toContain("borderline");
  });

  it("omits keyword sections when empty", () => {
    const prompt = buildPromptFromConfig("test", DEFAULT_AI_CONFIG);
    expect(prompt).not.toContain("BLOCKED KEYWORDS");
    expect(prompt).not.toContain("FLAGGED KEYWORDS");
  });

  it("includes language requirements", () => {
    const config = {
      ...DEFAULT_AI_CONFIG,
      language_requirements: ["en", "es"],
    };
    const prompt = buildPromptFromConfig("test", config);
    expect(prompt).toContain("EN");
    expect(prompt).toContain("ES");
  });

  it("shows all languages welcome when no requirements", () => {
    const prompt = buildPromptFromConfig("test", DEFAULT_AI_CONFIG);
    expect(prompt).toContain("All languages are welcome");
  });

  it("includes user requirements when set", () => {
    const config = {
      ...DEFAULT_AI_CONFIG,
      minimum_account_age_days: 7,
      minimum_spark_score: 50,
    };
    const prompt = buildPromptFromConfig("test", config);
    expect(prompt).toContain("USER REQUIREMENTS:");
    expect(prompt).toContain("7 days");
    expect(prompt).toContain("50");
  });

  it("omits user requirements section when all zero", () => {
    const prompt = buildPromptFromConfig("test", DEFAULT_AI_CONFIG);
    expect(prompt).not.toContain("USER REQUIREMENTS:");
  });

  it("describes toxicity levels correctly", () => {
    const low = buildPromptFromConfig("test", {
      ...DEFAULT_AI_CONFIG,
      toxicity_threshold: 10,
    });
    expect(low).toMatch(/lenient/i);

    const high = buildPromptFromConfig("test", {
      ...DEFAULT_AI_CONFIG,
      toxicity_threshold: 85,
    });
    expect(high).toMatch(/strict/i);
  });

  it("describes spam sensitivity levels", () => {
    const low = buildPromptFromConfig("test", {
      ...DEFAULT_AI_CONFIG,
      spam_sensitivity: "low",
    });
    expect(low).toContain("LOW");

    const high = buildPromptFromConfig("test", {
      ...DEFAULT_AI_CONFIG,
      spam_sensitivity: "high",
    });
    expect(high).toContain("HIGH");
  });

  it("describes content policies", () => {
    const config: CampfireAIConfig = {
      ...DEFAULT_AI_CONFIG,
      self_promotion_policy: "block",
      link_sharing_policy: "flag",
    };
    const prompt = buildPromptFromConfig("test", config);
    expect(prompt).toContain("Self-promotion: BLOCK");
    expect(prompt).toContain("External links: FLAG");
  });

  it("marks disallowed post types", () => {
    const config = {
      ...DEFAULT_AI_CONFIG,
      allowed_post_types: ["text"] as CampfireAIConfig["allowed_post_types"],
    };
    const prompt = buildPromptFromConfig("test", config);
    expect(prompt).toContain("Text posts");
    expect(prompt).toContain("Link posts are NOT allowed");
    expect(prompt).toContain("Image posts are NOT allowed");
  });

  it("includes require_english in language section", () => {
    const config = {
      ...DEFAULT_AI_CONFIG,
      require_english: true,
      language_requirements: [],
    };
    const prompt = buildPromptFromConfig("test", config);
    expect(prompt).toContain("EN");
  });
});

// ---------------------------------------------------------------------------
// Feature Flags Tests
// ---------------------------------------------------------------------------

describe("feature flags (getAllFeatureFlags)", () => {
  it("returns all flags as false when env vars are not set", () => {
    const flags = getAllFeatureFlags();
    expect(flags.ENABLE_BADGE_DISTRIBUTION).toBe(false);
    expect(flags.ENABLE_COSMETICS_SHOP).toBe(false);
    expect(flags.ENABLE_TIP_JAR).toBe(false);
    expect(flags.ENABLE_NOTIFICATIONS).toBe(false);
  });

  it("returns true when env var is 'true'", () => {
    process.env.ENABLE_BADGE_DISTRIBUTION = "true";
    expect(isFeatureEnabled("ENABLE_BADGE_DISTRIBUTION")).toBe(true);
    delete process.env.ENABLE_BADGE_DISTRIBUTION;
  });

  it("returns true when env var is '1'", () => {
    process.env.ENABLE_TIP_JAR = "1";
    expect(isFeatureEnabled("ENABLE_TIP_JAR")).toBe(true);
    delete process.env.ENABLE_TIP_JAR;
  });

  it("returns false for any other value", () => {
    process.env.ENABLE_NOTIFICATIONS = "yes";
    expect(isFeatureEnabled("ENABLE_NOTIFICATIONS")).toBe(false);
    delete process.env.ENABLE_NOTIFICATIONS;
  });
});
