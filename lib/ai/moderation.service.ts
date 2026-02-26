/**
 * AI Moderation Service — Two-Tier AI-Powered Moderation Pipeline
 *
 * Orchestrates the full moderation pipeline:
 * 1. Platform agent checks global Principles (hardcoded, non-negotiable)
 * 2. Campfire agent checks campfire-specific Tender rules
 *
 * Content passes through tiers in order. First removal stops the chain.
 * All decisions are logged to campfire_mod_logs for public transparency.
 *
 * Supports multiple AI backends via the provider abstraction:
 * - Anthropic Claude API (default, requires ANTHROPIC_API_KEY)
 * - Local Ollama instance (free, private, requires local GPU)
 * - Ollama-first with Anthropic fallback (best of both worlds)
 *
 * Configure via AI_PROVIDER env var: "anthropic" | "ollama" | "ollama-fallback"
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  buildCampfirePrompt,
  buildPlatformPrompt,
  type ModerationContent,
  type BuiltPrompt,
} from "./prompt-builder";
import { validateAIResponse } from "./injection-defense";
import {
  buildPromptFromConfig,
  type CampfireAIConfig,
} from "./structured-config";
import type { AIProvider } from "./providers/types";
import { createProviderWithFallback } from "./providers";

/** Full moderation decision with metadata */
export interface ModerationDecision {
  decision: "approved" | "removed" | "flagged";
  confidence: number;
  reasoning: string;
  agent_level: "campfire" | "platform";
  ai_model: string;
  prompt_version: number;
  injection_detected: boolean;
  injection_patterns: string[];
  processing_time_ms: number;
}

/** Result of the two-tier moderation pipeline */
export interface ModerationPipelineResult {
  final_decision: "approved" | "removed" | "flagged";
  tier_decisions: ModerationDecision[];
  total_time_ms: number;
  stopped_at_tier: "campfire" | "platform" | null;
}

/** Campfire context needed for moderation */
export interface CampfireContext {
  id: string;
  name: string;
  ai_prompt: string;
  ai_prompt_version: number;
  ai_config?: CampfireAIConfig | null;
}

/** Database interface for logging */
export interface ModerationDB {
  query: (
    text: string,
    params?: unknown[]
  ) => Promise<{ rows: Record<string, unknown>[] }>;
}

const AI_MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 200;
const TEMPERATURE = 0;
const TIMEOUT_MS = 5000;

/**
 * Create an Anthropic client instance.
 * Separated for testability — tests can mock this.
 * @deprecated Use createProviderWithFallback() instead for new code.
 */
export function createAnthropicClient(apiKey?: string): Anthropic {
  return new Anthropic({
    apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
  });
}

/**
 * Call Claude API with a built prompt and parse the response.
 * @deprecated Use AIProvider.callModeration() instead for new code.
 */
export async function callClaudeForModeration(
  client: Anthropic,
  prompt: BuiltPrompt
): Promise<{
  decision: "approve" | "remove" | "flag";
  reason: string;
  valid: boolean;
}> {
  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: prompt.system,
    messages: [{ role: "user", content: prompt.user }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return {
      decision: "flag",
      reason: "AI returned no text response — flagged for review",
      valid: false,
    };
  }

  return validateAIResponse(textBlock.text);
}

/**
 * Map Claude's approve/remove/flag to our internal approved/removed/flagged.
 */
function mapDecision(
  aiDecision: "approve" | "remove" | "flag"
): "approved" | "removed" | "flagged" {
  switch (aiDecision) {
    case "approve":
      return "approved";
    case "remove":
      return "removed";
    case "flag":
      return "flagged";
  }
}

/**
 * Run a single tier of moderation using a provider.
 */
async function runTier(
  provider: AIProvider,
  prompt: BuiltPrompt,
  promptVersion: number
): Promise<ModerationDecision> {
  const start = Date.now();

  const injectionDetected =
    prompt.content_sanitization.injection_detected ||
    (prompt.rules_sanitization?.injection_detected ?? false);

  const injectionPatterns = [
    ...prompt.content_sanitization.injection_patterns_found,
    ...(prompt.rules_sanitization?.injection_patterns_found ?? []),
  ];

  try {
    const result = await provider.callModeration(prompt);
    const elapsed = Date.now() - start;

    // If injection was detected AND AI approved, override to flag
    const finalDecision =
      injectionDetected && result.decision === "approve"
        ? "flagged"
        : mapDecision(result.decision);

    const finalReason =
      injectionDetected && result.decision === "approve"
        ? `Injection patterns detected (${injectionPatterns.join(", ")}). Content flagged for review despite AI approval.`
        : result.reason;

    return {
      decision: finalDecision,
      confidence: result.valid ? 0.85 : 0.5,
      reasoning: finalReason,
      agent_level: prompt.tier,
      ai_model: provider.model,
      prompt_version: promptVersion,
      injection_detected: injectionDetected,
      injection_patterns: injectionPatterns,
      processing_time_ms: elapsed,
    };
  } catch (error) {
    const elapsed = Date.now() - start;

    // On API failure, flag for human review (fail safe)
    return {
      decision: "flagged",
      confidence: 0,
      reasoning: `AI moderation error: ${error instanceof Error ? error.message : "Unknown error"}. Content flagged for review.`,
      agent_level: prompt.tier,
      ai_model: provider.model,
      prompt_version: promptVersion,
      injection_detected: injectionDetected,
      injection_patterns: injectionPatterns,
      processing_time_ms: elapsed,
    };
  }
}

/**
 * Run the two-tier moderation pipeline.
 *
 * Order: Platform (Principles) -> Campfire (Tender)
 * First removal stops the chain.
 * Flagged content continues through remaining tiers.
 */
export async function runModerationPipeline(
  provider: AIProvider,
  content: ModerationContent,
  campfire: CampfireContext
): Promise<ModerationPipelineResult> {
  const pipelineStart = Date.now();
  const tierDecisions: ModerationDecision[] = [];

  // Tier 1: Platform agent (global Principles)
  const platformPrompt = buildPlatformPrompt(campfire.name, content);
  const platformDecision = await runTier(provider, platformPrompt, 1);
  tierDecisions.push(platformDecision);

  if (platformDecision.decision === "removed") {
    return {
      final_decision: "removed",
      tier_decisions: tierDecisions,
      total_time_ms: Date.now() - pipelineStart,
      stopped_at_tier: "platform",
    };
  }

  // Tier 2: Campfire agent (campfire-specific Tender rules)
  // If structured config exists, generate prompt from it; otherwise use raw ai_prompt
  const campfireRules = campfire.ai_config
    ? buildPromptFromConfig(campfire.name, campfire.ai_config)
    : campfire.ai_prompt;
  const campfirePrompt = buildCampfirePrompt(
    campfire.name,
    campfireRules,
    content
  );
  const campfireDecision = await runTier(
    provider,
    campfirePrompt,
    campfire.ai_prompt_version
  );
  tierDecisions.push(campfireDecision);

  if (campfireDecision.decision === "removed") {
    return {
      final_decision: "removed",
      tier_decisions: tierDecisions,
      total_time_ms: Date.now() - pipelineStart,
      stopped_at_tier: "campfire",
    };
  }

  // All tiers passed — check if any flagged
  const anyFlagged = tierDecisions.some((d) => d.decision === "flagged");

  return {
    final_decision: anyFlagged ? "flagged" : "approved",
    tier_decisions: tierDecisions,
    total_time_ms: Date.now() - pipelineStart,
    stopped_at_tier: null,
  };
}

/**
 * Log a moderation decision to the database (public audit trail).
 */
export async function logModerationDecision(
  db: ModerationDB,
  contentType: "post" | "comment",
  contentId: string,
  campfireId: string,
  authorId: string,
  decision: ModerationDecision
): Promise<string> {
  const result = await db.query(
    `INSERT INTO campfire_mod_logs
     (content_type, content_id, campfire_id, author_id, agent_level,
      decision, reason, ai_model, prompt_version, injection_detected)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      contentType,
      contentId,
      campfireId,
      authorId,
      decision.agent_level,
      decision.decision,
      decision.reasoning,
      decision.ai_model,
      decision.prompt_version,
      decision.injection_detected,
    ]
  );
  return (result.rows[0] as { id: string }).id;
}

/**
 * High-level moderation function that integrates with the existing codebase.
 *
 * This replaces the Phase 2 auto-approve stub in lib/moderation/moderate.ts.
 * Falls back to basic safety filter if no AI provider is available.
 *
 * Provider selection is controlled by the AI_PROVIDER environment variable:
 * - "anthropic": Always use Anthropic Claude API (requires ANTHROPIC_API_KEY)
 * - "ollama": Always use local Ollama instance
 * - "ollama-fallback": Try Ollama first, fall back to Anthropic if unavailable
 */
export async function moderateContentWithAI(
  content: ModerationContent,
  campfire: CampfireContext,
  apiKey?: string
): Promise<ModerationPipelineResult> {
  const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
  const providerType = process.env.AI_PROVIDER ?? "anthropic";

  // If no API key and not using Ollama, fall back to basic safety filter
  if (!key && providerType === "anthropic") {
    return runBasicSafetyFilter(content, campfire);
  }

  try {
    const { provider, usingFallback } = await createProviderWithFallback();

    if (usingFallback) {
      console.log(
        `[moderation] Using fallback provider for content moderation`
      );
    }

    // Add timeout to entire pipeline — Ollama needs more time
    const timeoutMs = providerType.includes("ollama") ? 20000 : TIMEOUT_MS;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Moderation pipeline timed out")),
        timeoutMs
      );
    });

    return await Promise.race([
      runModerationPipeline(provider, content, campfire),
      timeoutPromise,
    ]);
  } catch (error) {
    // On any pipeline failure, return a flagged result
    return {
      final_decision: "flagged",
      tier_decisions: [
        {
          decision: "flagged",
          confidence: 0,
          reasoning: `Pipeline error: ${error instanceof Error ? error.message : "Unknown error"}`,
          agent_level: "platform",
          ai_model: process.env.AI_PROVIDER ?? "unknown",
          prompt_version: 1,
          injection_detected: false,
          injection_patterns: [],
          processing_time_ms: 0,
        },
      ],
      total_time_ms: 0,
      stopped_at_tier: null,
    };
  }
}

/**
 * Basic safety filter (fallback when no API key is configured).
 * Mirrors the Phase 2 behavior but with the new interface.
 */
function runBasicSafetyFilter(
  content: ModerationContent,
  campfire: CampfireContext
): ModerationPipelineResult {
  const start = Date.now();
  const text = `${content.title ?? ""} ${content.body}`.toLowerCase();

  const hasExtremeContent =
    /\b(kill yourself|bomb threat|child porn|csam)\b/i.test(text);

  if (hasExtremeContent) {
    return {
      final_decision: "removed",
      tier_decisions: [
        {
          decision: "removed",
          confidence: 0.95,
          reasoning:
            "Content flagged by basic safety filter (AI moderation unavailable)",
          agent_level: "platform",
          ai_model: "basic-safety-filter",
          prompt_version: 0,
          injection_detected: false,
          injection_patterns: [],
          processing_time_ms: Date.now() - start,
        },
      ],
      total_time_ms: Date.now() - start,
      stopped_at_tier: "platform",
    };
  }

  return {
    final_decision: "approved",
    tier_decisions: [
      {
        decision: "approved",
        confidence: 1.0,
        reasoning:
          "Auto-approved (AI moderation unavailable — basic safety check passed)",
        agent_level: "campfire",
        ai_model: "basic-safety-filter",
        prompt_version: 0,
        injection_detected: false,
        injection_patterns: [],
        processing_time_ms: Date.now() - start,
      },
    ],
    total_time_ms: Date.now() - start,
    stopped_at_tier: null,
  };
}
