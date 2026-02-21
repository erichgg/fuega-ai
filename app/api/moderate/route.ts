/**
 * POST /api/moderate — AI content moderation endpoint
 *
 * Runs content through the three-tier AI moderation pipeline:
 * 1. Platform agent (global ToS)
 * 2. Category agent (category rules, if applicable)
 * 3. Community agent (community-specific rules)
 *
 * Returns structured decision with reasoning for public audit log.
 *
 * Rate limited: 50 per user per hour (see SECURITY.md)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  moderateContentWithAI,
  logModerationDecision,
  type CommunityContext,
} from "@/lib/ai/moderation.service";
import { query, queryOne } from "@/lib/db";

const moderateRequestSchema = z.object({
  content_type: z.enum(["post", "comment"]),
  content_id: z.string().uuid("Invalid content ID"),
  community_id: z.string().uuid("Invalid community ID"),
  title: z.string().max(300).optional(),
  body: z.string().min(1, "Content body is required").max(40000),
  author_id: z.string().uuid("Invalid author ID"),
  author_username: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = moderateRequestSchema.parse(body);

    // Fetch community context (rules, category, prompt version)
    const community = await queryOne<{
      id: string;
      name: string;
      ai_prompt: string;
      ai_prompt_version: number;
    }>(
      `SELECT id, name, ai_prompt, ai_prompt_version
       FROM communities
       WHERE id = $1 AND deleted_at IS NULL AND is_banned = false`,
      [validated.community_id]
    );

    if (!community) {
      return NextResponse.json(
        { error: "Community not found", code: "COMMUNITY_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Fetch category rules if community belongs to a category
    const categoryRules = await queryOne<{
      ai_prompt: string;
      ai_prompt_version: number;
    }>(
      `SELECT c.ai_prompt, c.ai_prompt_version
       FROM categories cat
       JOIN communities c ON c.category_id = cat.id
       WHERE c.id = $1 AND cat.ai_prompt IS NOT NULL`,
      [validated.community_id]
    );

    const communityContext: CommunityContext = {
      id: community.id,
      name: community.name,
      ai_prompt: community.ai_prompt,
      ai_prompt_version: community.ai_prompt_version,
      category_rules: categoryRules?.ai_prompt,
      category_prompt_version: categoryRules?.ai_prompt_version,
    };

    // Run the three-tier moderation pipeline
    const result = await moderateContentWithAI(
      {
        content_type: validated.content_type,
        title: validated.title,
        body: validated.body,
        author_username: validated.author_username,
      },
      communityContext
    );

    // Log each tier's decision to the public moderation log
    const logIds: string[] = [];
    for (const tierDecision of result.tier_decisions) {
      const logId = await logModerationDecision(
        { query },
        validated.content_type,
        validated.content_id,
        validated.community_id,
        validated.author_id,
        tierDecision
      );
      logIds.push(logId);
    }

    return NextResponse.json({
      decision: result.final_decision,
      tier_decisions: result.tier_decisions.map((d) => ({
        agent_level: d.agent_level,
        decision: d.decision,
        reasoning: d.reasoning,
        confidence: d.confidence,
        processing_time_ms: d.processing_time_ms,
      })),
      stopped_at_tier: result.stopped_at_tier,
      total_time_ms: result.total_time_ms,
      log_ids: logIds,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error("Moderation endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
