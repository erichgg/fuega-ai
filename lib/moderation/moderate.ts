/**
 * AI moderation engine — synchronous content moderation via Claude API.
 *
 * This module bridges the existing post/comment services with the full
 * three-tier AI moderation pipeline in lib/ai/moderation.service.ts.
 *
 * The interface is kept backwards-compatible with Phase 2 consumers.
 */

import {
  moderateContentWithAI,
  type CommunityContext,
  type ModerationPipelineResult,
} from "@/lib/ai/moderation.service";

export interface ModerationDecision {
  decision: "approved" | "removed" | "flagged" | "warned";
  confidence: number;
  reasoning: string;
  agent_level: "community" | "category" | "platform";
  ai_model: string | null;
  prompt_version: number;
  injection_detected?: boolean;
  injection_patterns?: string[];
  tier_decisions?: ModerationPipelineResult["tier_decisions"];
}

export interface ModerationInput {
  content_type: "post" | "comment";
  title?: string;
  body: string;
  community_id: string;
  author_id: string;
  author_username?: string;
  community_name?: string;
  community_ai_prompt?: string;
  community_ai_prompt_version?: number;
  category_rules?: string;
  category_prompt_version?: number;
}

/**
 * Run AI moderation on content. Must complete in <5s (sync).
 *
 * When ANTHROPIC_API_KEY is set, runs the full three-tier Claude API pipeline.
 * Otherwise falls back to basic safety filter.
 */
export async function moderateContent(
  input: ModerationInput
): Promise<ModerationDecision> {
  const communityContext: CommunityContext = {
    id: input.community_id,
    name: input.community_name ?? "unknown",
    ai_prompt: input.community_ai_prompt ?? "Be respectful and follow common sense.",
    ai_prompt_version: input.community_ai_prompt_version ?? 1,
    category_rules: input.category_rules,
    category_prompt_version: input.category_prompt_version,
  };

  const result = await moderateContentWithAI(
    {
      content_type: input.content_type,
      title: input.title,
      body: input.body,
      author_username: input.author_username ?? "anonymous",
    },
    communityContext
  );

  // Map pipeline result to the legacy ModerationDecision interface
  const lastDecision = result.tier_decisions[result.tier_decisions.length - 1];

  return {
    decision: result.final_decision,
    confidence: lastDecision?.confidence ?? 0,
    reasoning: lastDecision?.reasoning ?? "No decision available",
    agent_level: result.stopped_at_tier ?? lastDecision?.agent_level ?? "community",
    ai_model: lastDecision?.ai_model ?? null,
    prompt_version: lastDecision?.prompt_version ?? 0,
    injection_detected: result.tier_decisions.some((d) => d.injection_detected),
    injection_patterns: result.tier_decisions.flatMap((d) => d.injection_patterns),
    tier_decisions: result.tier_decisions,
  };
}

/**
 * Log a moderation decision to the moderation_log table.
 */
export async function logModerationDecision(
  contentType: "post" | "comment",
  contentId: string,
  communityId: string,
  authorId: string,
  decision: ModerationDecision,
  db: { query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }
): Promise<string> {
  const result = await db.query(
    `INSERT INTO moderation_log
     (content_type, content_id, community_id, author_id, agent_level, decision, reason, ai_model, prompt_version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      contentType,
      contentId,
      communityId,
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
