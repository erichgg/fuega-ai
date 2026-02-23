import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/jwt";
import { query, queryOne } from "@/lib/db";
import {
  DEFAULT_AI_CONFIG,
  validateConfig,
  buildPromptFromConfig,
  type CampfireAIConfig,
} from "@/lib/ai/structured-config";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface CampfireRow {
  id: string;
  name: string;
  ai_config: CampfireAIConfig | null;
  ai_prompt: string;
  ai_prompt_version: number;
}

/**
 * GET /api/campfires/:id/ai-config
 * Returns the current structured AI config for a campfire.
 * Public — anyone can see a campfire's moderation settings.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const campfire = await queryOne<CampfireRow>(
      `SELECT id, name, ai_config, ai_prompt, ai_prompt_version
       FROM campfires
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (!campfire) {
      return NextResponse.json(
        { error: "Campfire not found", code: "CAMPFIRE_NOT_FOUND" },
        { status: 404 }
      );
    }

    const config = campfire.ai_config ?? DEFAULT_AI_CONFIG;

    return NextResponse.json({
      campfire_id: campfire.id,
      campfire_name: campfire.name,
      config,
      prompt_version: campfire.ai_prompt_version,
    });
  } catch (err) {
    console.error("Get AI config error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/campfires/:id/ai-config
 * Directly update AI config (founder/admin only — bypasses proposal system).
 * For governance-driven changes, use the config-proposals endpoint.
 */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check campfire exists and user is founder/admin
    const membership = await queryOne<{ role: string; name: string }>(
      `SELECT cm.role, c.name
       FROM campfire_members cm
       JOIN campfires c ON c.id = cm.campfire_id
       WHERE cm.campfire_id = $1 AND cm.user_id = $2 AND c.deleted_at IS NULL`,
      [id, user.userId]
    );

    if (!membership) {
      return NextResponse.json(
        { error: "Campfire not found or not a member", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (membership.role !== "admin" && membership.role !== "founder") {
      return NextResponse.json(
        { error: "Only the campfire founder can directly update AI config", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validation = validateConfig(body);

    if (!validation.valid || !validation.config) {
      return NextResponse.json(
        { error: validation.errors?.[0] ?? "Invalid config", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Generate prompt from config
    const generatedPrompt = buildPromptFromConfig(
      membership.name,
      validation.config
    );

    // Update campfire with new config and generated prompt
    await query(
      `UPDATE campfires
       SET ai_config = $1,
           ai_prompt = $2,
           ai_prompt_version = ai_prompt_version + 1
       WHERE id = $3`,
      [JSON.stringify(validation.config), generatedPrompt, id]
    );

    // Log in prompt history
    await query(
      `INSERT INTO ai_prompt_history
       (entity_type, entity_id, prompt_text, version, created_by)
       VALUES ('campfire', $1, $2,
         (SELECT ai_prompt_version FROM campfires WHERE id = $1),
         $3)`,
      [id, generatedPrompt, user.userId]
    );

    return NextResponse.json({
      config: validation.config,
      generated_prompt: generatedPrompt,
      message: "AI config updated successfully",
    });
  } catch (err) {
    console.error("Update AI config error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
