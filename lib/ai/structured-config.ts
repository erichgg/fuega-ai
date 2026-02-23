/**
 * Structured AI Configuration for Campfire Moderation
 *
 * Replaces free-form AI prompts with a validated, structured config.
 * Communities configure moderation through predefined settings,
 * and the system auto-generates the AI prompt from that config.
 *
 * Guardrails are server-side enforced — no config can bypass platform rules.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const spamSensitivityValues = ["low", "medium", "high"] as const;
export type SpamSensitivity = (typeof spamSensitivityValues)[number];

export const contentPolicyValues = ["block", "flag", "allow"] as const;
export type ContentPolicy = (typeof contentPolicyValues)[number];

export const postTypeValues = ["text", "link", "image"] as const;
export type PostType = (typeof postTypeValues)[number];

export interface CampfireAIConfig {
  // Content Filtering
  toxicity_threshold: number;
  spam_sensitivity: SpamSensitivity;
  self_promotion_policy: ContentPolicy;
  link_sharing_policy: ContentPolicy;

  // Content Types
  allowed_post_types: PostType[];
  allow_nsfw: boolean;

  // Language
  language_requirements: string[];
  require_english: boolean;

  // User Requirements
  minimum_account_age_days: number;
  minimum_spark_score: number;

  // Custom Filters
  blocked_keywords: string[];
  flagged_keywords: string[];

  // Governance
  config_change_quorum: number;
  config_change_threshold: number;
  config_change_voting_days: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_AI_CONFIG: CampfireAIConfig = {
  toxicity_threshold: 50,
  spam_sensitivity: "medium",
  self_promotion_policy: "flag",
  link_sharing_policy: "allow",
  allowed_post_types: ["text", "link", "image"],
  allow_nsfw: false,
  language_requirements: [],
  require_english: false,
  minimum_account_age_days: 0,
  minimum_spark_score: 0,
  blocked_keywords: [],
  flagged_keywords: [],
  config_change_quorum: 10,
  config_change_threshold: 66,
  config_change_voting_days: 7,
};

// ---------------------------------------------------------------------------
// Zod Validation Schema
// ---------------------------------------------------------------------------

/** ISO 639-1 language code pattern (2 lowercase letters) */
const iso639Pattern = /^[a-z]{2}$/;

/** Keyword: printable, no pipe/newline, max 50 chars */
const keywordSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[^\n|]+$/, "Keywords must not contain newlines or pipe characters");

export const campfireAIConfigSchema = z
  .object({
    toxicity_threshold: z
      .number()
      .int()
      .min(0, "Toxicity threshold minimum is 0")
      .max(90, "Toxicity threshold cannot exceed 90 — some moderation must always be active"),
    spam_sensitivity: z.enum(spamSensitivityValues),
    self_promotion_policy: z.enum(contentPolicyValues),
    link_sharing_policy: z.enum(contentPolicyValues),
    allowed_post_types: z
      .array(z.enum(postTypeValues))
      .min(1, "At least one post type must be allowed")
      .refine(
        (arr) => new Set(arr).size === arr.length,
        "Duplicate post types are not allowed"
      ),
    allow_nsfw: z.boolean(),
    language_requirements: z
      .array(
        z.string().regex(iso639Pattern, "Must be a valid ISO 639-1 language code (e.g. 'en', 'es')")
      )
      .max(20, "Maximum 20 language codes"),
    require_english: z.boolean(),
    minimum_account_age_days: z
      .number()
      .int()
      .min(0)
      .max(365, "Maximum account age requirement is 365 days"),
    minimum_spark_score: z
      .number()
      .int()
      .min(0)
      .max(10000, "Maximum spark score requirement is 10,000"),
    blocked_keywords: z
      .array(keywordSchema)
      .max(100, "Maximum 100 blocked keywords"),
    flagged_keywords: z
      .array(keywordSchema)
      .max(100, "Maximum 100 flagged keywords"),
    config_change_quorum: z
      .number()
      .int()
      .min(5, "Quorum cannot be less than 5% — prevents minority takeover")
      .max(100),
    config_change_threshold: z
      .number()
      .int()
      .min(51, "Threshold cannot be less than 51% — simple majority required")
      .max(100),
    config_change_voting_days: z.number().int().min(1).max(30),
  })
  .refine(
    (config) =>
      config.blocked_keywords.length + config.flagged_keywords.length <= 200,
    "Combined blocked + flagged keywords cannot exceed 200"
  );

/**
 * Validate a partial config update (only changed fields).
 * Uses the same constraints but makes all fields optional.
 */
export const partialAIConfigSchema = campfireAIConfigSchema.innerType().partial();

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export interface ConfigValidationResult {
  valid: boolean;
  config?: CampfireAIConfig;
  errors?: string[];
}

/**
 * Validate a full campfire AI config.
 */
export function validateConfig(input: unknown): ConfigValidationResult {
  const result = campfireAIConfigSchema.safeParse(input);
  if (result.success) {
    return { valid: true, config: result.data };
  }
  return {
    valid: false,
    errors: result.error.errors.map((e) => e.message),
  };
}

/**
 * Validate a partial config update and merge with existing config.
 */
export function validateAndMergeConfig(
  existing: CampfireAIConfig,
  changes: Record<string, unknown>
): ConfigValidationResult {
  // Validate the partial changes
  const partialResult = partialAIConfigSchema.safeParse(changes);
  if (!partialResult.success) {
    return {
      valid: false,
      errors: partialResult.error.errors.map((e) => e.message),
    };
  }

  // Merge with existing and validate the full config
  const merged = { ...existing, ...partialResult.data };
  return validateConfig(merged);
}

// ---------------------------------------------------------------------------
// Prompt Generation
// ---------------------------------------------------------------------------

/** Platform rules that are ALWAYS appended — non-negotiable. */
const PLATFORM_RULES = [
  "No CSAM (child sexual abuse material) or sexualization of minors",
  "No direct, credible incitement to specific violence against identified targets",
  "No doxxing (sharing personal identifying information without consent)",
  "No spam or coordinated bot networks",
  "No impersonation of real individuals or organizations",
];

function describeToxicity(threshold: number): string {
  if (threshold === 0) {
    return "No toxicity filter applied (platform rules still enforced).";
  }
  if (threshold <= 20) {
    return `Very lenient: Only remove content that is extremely toxic (above ${threshold}% toxicity score).`;
  }
  if (threshold <= 40) {
    return `Lenient: Remove content that is clearly toxic (above ${threshold}% toxicity score).`;
  }
  if (threshold <= 60) {
    return `Moderate: Remove content that exceeds ${threshold}% toxicity. Standard moderation level.`;
  }
  if (threshold <= 80) {
    return `Strict: Remove content exceeding ${threshold}% toxicity. Low tolerance for hostile language.`;
  }
  return `Very strict: Remove content exceeding ${threshold}% toxicity. Minimal tolerance for any hostile language.`;
}

function describeSpam(sensitivity: SpamSensitivity): string {
  switch (sensitivity) {
    case "low":
      return "LOW spam sensitivity. Only remove obvious spam (repeated identical content, bulk commercial posts).";
    case "medium":
      return "MEDIUM spam sensitivity. Remove spam and low-effort repetitive content.";
    case "high":
      return "HIGH spam sensitivity. Aggressively filter repetitive, low-effort, or promotional content.";
  }
}

function describePolicy(label: string, policy: ContentPolicy): string {
  switch (policy) {
    case "block":
      return `${label}: BLOCK — automatically remove.`;
    case "flag":
      return `${label}: FLAG — flag for campfire review, do not auto-remove.`;
    case "allow":
      return `${label}: ALLOW — permitted without restriction.`;
  }
}

function describeLanguages(codes: string[], requireEnglish: boolean): string {
  if (codes.length === 0 && !requireEnglish) {
    return "All languages are welcome.";
  }
  const langs = requireEnglish && !codes.includes("en") ? ["en", ...codes] : codes;
  if (langs.length === 0) return "All languages are welcome.";
  return `Only content in these languages is allowed: ${langs.join(", ").toUpperCase()}. Remove content in other languages.`;
}

/**
 * Build a natural-language AI moderation prompt from structured config.
 * This is the core function that replaces free-form prompt writing.
 */
export function buildPromptFromConfig(
  campfireName: string,
  config: CampfireAIConfig
): string {
  const sections: string[] = [];

  // Header
  sections.push(
    `You are the AI moderation agent for the f/${campfireName} campfire on fuega.ai.`
  );

  // Content policy
  sections.push("");
  sections.push("CONTENT POLICY:");
  sections.push(`- Toxicity: ${describeToxicity(config.toxicity_threshold)}`);
  sections.push(`- Spam: ${describeSpam(config.spam_sensitivity)}`);
  sections.push(
    `- ${describePolicy("Self-promotion", config.self_promotion_policy)}`
  );
  sections.push(
    `- ${describePolicy("External links", config.link_sharing_policy)}`
  );

  // NSFW
  if (config.allow_nsfw) {
    sections.push("- NSFW: Allowed. NSFW content is permitted in this campfire.");
  } else {
    sections.push("- NSFW: NOT ALLOWED. Remove any NSFW content.");
  }

  // Language
  sections.push(
    `- Language: ${describeLanguages(config.language_requirements, config.require_english)}`
  );

  // Keywords
  if (config.blocked_keywords.length > 0) {
    sections.push("");
    sections.push("BLOCKED KEYWORDS (auto-remove if present):");
    for (const kw of config.blocked_keywords) {
      sections.push(`- ${kw}`);
    }
  }

  if (config.flagged_keywords.length > 0) {
    sections.push("");
    sections.push("FLAGGED KEYWORDS (flag for review if present):");
    for (const kw of config.flagged_keywords) {
      sections.push(`- ${kw}`);
    }
  }

  // Allowed content types
  sections.push("");
  sections.push("ALLOWED CONTENT TYPES:");
  const typeLabels: Record<PostType, string> = {
    text: "Text posts",
    link: "Link posts",
    image: "Image posts",
  };
  for (const pt of postTypeValues) {
    if (config.allowed_post_types.includes(pt)) {
      sections.push(`- ${typeLabels[pt]}`);
    } else {
      sections.push(`- (${typeLabels[pt]} are NOT allowed)`);
    }
  }

  // User requirements
  if (config.minimum_account_age_days > 0 || config.minimum_spark_score > 0) {
    sections.push("");
    sections.push("USER REQUIREMENTS:");
    if (config.minimum_account_age_days > 0) {
      sections.push(
        `- Minimum account age: ${config.minimum_account_age_days} days`
      );
    }
    if (config.minimum_spark_score > 0) {
      sections.push(
        `- Minimum spark score: ${config.minimum_spark_score}`
      );
    }
  }

  // Platform rules (always appended, non-negotiable)
  sections.push("");
  sections.push("PLATFORM RULES (NON-NEGOTIABLE, always enforced):");
  for (const rule of PLATFORM_RULES) {
    sections.push(`- ${rule}`);
  }

  // Output format
  sections.push("");
  sections.push(
    'Respond with a JSON decision: {"decision": "approve" | "remove" | "flag", "confidence": 0.0-1.0, "reasoning": "explanation"}'
  );

  return sections.join("\n");
}

/** Expose PLATFORM_RULES for testing */
export { PLATFORM_RULES };
