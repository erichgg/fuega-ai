/**
 * AI moderation engine — synchronous content moderation via Claude API.
 *
 * This module bridges the existing post/comment services with the
 * two-tier AI moderation pipeline in lib/ai/moderation.service.ts.
 *
 * The interface is kept backwards-compatible with Phase 2 consumers.
 */

import {
  moderateContentWithAI,
  type CampfireContext,
} from "@/lib/ai/moderation.service";
import { sanitizeText } from "@/lib/sanitize";

export interface ModerationDecision {
  decision: "approved" | "removed" | "flagged" | "warned";
  confidence: number;
  reasoning: string;
  agent_level: "campfire" | "platform";
  ai_model: string | null;
  prompt_version: number;
  injection_detected?: boolean;
  injection_patterns?: string[];
}

export interface ModerationInput {
  content_type: "post" | "comment";
  title?: string;
  body: string;
  campfire_id: string;
  author_id: string;
  author_username?: string;
  campfire_name?: string;
  campfire_ai_prompt?: string;
  campfire_ai_prompt_version?: number;
}

/**
 * Run AI moderation on content. Must complete in <5s (sync).
 *
 * When ANTHROPIC_API_KEY is set, runs the two-tier Claude API pipeline
 * (Platform Principles + Campfire Tender). Otherwise falls back to basic safety filter.
 */
export async function moderateContent(
  input: ModerationInput
): Promise<ModerationDecision> {
  const campfireContext: CampfireContext = {
    id: input.campfire_id,
    name: input.campfire_name ?? "unknown",
    ai_prompt: input.campfire_ai_prompt ?? "Be respectful and follow common sense.",
    ai_prompt_version: input.campfire_ai_prompt_version ?? 1,
  };

  const result = await moderateContentWithAI(
    {
      content_type: input.content_type,
      // Sanitize content before passing to AI to strip any injected HTML
      title: input.title ? sanitizeText(input.title) : undefined,
      body: sanitizeText(input.body),
      author_username: input.author_username ?? "anonymous",
    },
    campfireContext
  );

  // Map pipeline result to the legacy ModerationDecision interface
  const lastDecision = result.tier_decisions[result.tier_decisions.length - 1];

  return {
    decision: result.final_decision,
    confidence: lastDecision?.confidence ?? 0,
    reasoning: lastDecision?.reasoning ?? "No decision available",
    agent_level: result.stopped_at_tier ?? lastDecision?.agent_level ?? "campfire",
    ai_model: lastDecision?.ai_model ?? null,
    prompt_version: lastDecision?.prompt_version ?? 0,
    injection_detected: result.tier_decisions.some((d) => d.injection_detected),
    injection_patterns: result.tier_decisions.flatMap((d) => d.injection_patterns),
  };
}

/**
 * Log a moderation decision to the campfire_mod_logs table.
 */
export async function logModerationDecision(
  contentType: "post" | "comment",
  contentId: string,
  campfireId: string,
  authorId: string,
  decision: ModerationDecision,
  db: { query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }
): Promise<string> {
  const result = await db.query(
    `INSERT INTO campfire_mod_logs
     (content_type, content_id, campfire_id, author_id, agent_level, decision, reason, ai_model, prompt_version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
    ]
  );
  return (result.rows[0] as { id: string }).id;
}
