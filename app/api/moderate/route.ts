/**
 * POST /api/moderate — AI content moderation endpoint
 *
 * Runs content through the AI moderation pipeline:
 * 1. Platform agent (global ToS)
 * 2. Campfire agent (campfire-specific rules)
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
  type CampfireContext,
} from "@/lib/ai/moderation.service";
import { authenticate } from "@/lib/auth/jwt";
import { checkModerationRateLimit } from "@/lib/auth/rate-limit";
import { hashIp, getClientIp } from "@/lib/auth/ip-hash";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

const moderateRequestSchema = z.object({
  content_type: z.enum(["post", "comment"]),
  content_id: z.string().uuid("Invalid content ID"),
  campfire_id: z.string().uuid("Invalid campfire ID"),
  title: z.string().max(300).optional(),
  body: z.string().min(1, "Content body is required").max(40000),
  author_id: z.string().uuid("Invalid author ID"),
  author_username: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const ipHash = hashIp(getClientIp(req));
    const rateLimit = await checkModerationRateLimit(ipHash);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many moderation requests. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    const validated = moderateRequestSchema.parse(body);

    // Fetch campfire context (rules, prompt version)
    const campfire = await queryOne<{
      id: string;
      name: string;
      ai_prompt: string;
      ai_prompt_version: number;
    }>(
      `SELECT id, name, ai_prompt, ai_prompt_version
       FROM campfires
       WHERE id = $1 AND deleted_at IS NULL AND is_banned = false`,
      [validated.campfire_id]
    );

    if (!campfire) {
      return NextResponse.json(
        { error: "Campfire not found", code: "CAMPFIRE_NOT_FOUND" },
        { status: 404 }
      );
    }

    const campfireContext: CampfireContext = {
      id: campfire.id,
      name: campfire.name,
      ai_prompt: campfire.ai_prompt,
      ai_prompt_version: campfire.ai_prompt_version,
    };

    // Run the moderation pipeline
    const result = await moderateContentWithAI(
      {
        content_type: validated.content_type,
        title: validated.title,
        body: validated.body,
        author_username: validated.author_username,
      },
      campfireContext
    );

    // Log each tier's decision to the public moderation log
    const logIds: string[] = [];
    for (const tierDecision of result.tier_decisions) {
      const logId = await logModerationDecision(
        { query },
        validated.content_type,
        validated.content_id,
        validated.campfire_id,
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
