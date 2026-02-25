import { NextResponse } from "next/server";
import { z } from "zod";
import { queryAll, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

const modLogQuerySchema = z.object({
  campfire_id: z.string().uuid("Invalid campfire ID").optional(),
  action: z
    .enum(["approved", "removed", "flagged", "warned"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

interface ModLogRow {
  id: string;
  campfire_id: string;
  campfire_name: string;
  content_type: string;
  content_id: string;
  decision: string;
  reason: string;
  agent_level: string;
  ai_model: string | null;
  confidence: number | null;
  created_at: string;
  injection_detected: boolean;
}

interface CountRow {
  count: string;
}

/**
 * GET /api/mod-log
 * Public endpoint — transparency is core to the platform.
 * Returns paginated moderation log entries with campfire names.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const parsed = modLogQuerySchema.safeParse({
      campfire_id: url.searchParams.get("campfire_id") ?? undefined,
      action: url.searchParams.get("action") ?? undefined,
      limit: url.searchParams.get("limit") ?? "50",
      offset: url.searchParams.get("offset") ?? "0",
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.errors[0]?.message ?? "Invalid input",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    const { campfire_id, action, limit, offset } = parsed.data;

    // Build query with optional filters
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (campfire_id) {
      conditions.push(`m.campfire_id = $${paramIdx++}`);
      params.push(campfire_id);
    }

    if (action) {
      conditions.push(`m.decision = $${paramIdx++}`);
      params.push(action);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countRow = await queryOne<CountRow>(
      `SELECT COUNT(*) as count FROM campfire_mod_logs m ${whereClause}`,
      params,
    );
    const total = parseInt(countRow?.count ?? "0", 10);

    // Get entries
    const entries = await queryAll<ModLogRow>(
      `SELECT
        m.id,
        m.campfire_id,
        c.name AS campfire_name,
        m.content_type,
        m.content_id,
        m.decision,
        m.reason,
        m.agent_level,
        m.ai_model,
        m.created_at,
        m.injection_detected
      FROM campfire_mod_logs m
      LEFT JOIN campfires c ON c.id = m.campfire_id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset],
    );

    return NextResponse.json({
      entries: entries.map((e) => ({
        id: e.id,
        campfire_id: e.campfire_id,
        campfire_name: e.campfire_name ?? "unknown",
        content_type: e.content_type,
        content_id: e.content_id,
        decision: e.decision,
        reason: e.reason,
        agent_level: e.agent_level,
        ai_model: e.ai_model,
        created_at: e.created_at,
        injection_detected: e.injection_detected ?? false,
      })),
      total,
    });
  } catch (err) {
    console.error("Mod log fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
