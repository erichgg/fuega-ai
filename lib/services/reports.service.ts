import { query, queryOne, queryAll } from "@/lib/db";

// ─── Types ───────────────────────────────────────────────────

export interface Report {
  id: string;
  reporter_id: string;
  campfire_id: string | null;
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  details: string | null;
  status: "pending" | "reviewed" | "actioned" | "dismissed";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface CreateReportInput {
  reporterId: string;
  postId?: string;
  commentId?: string;
  campfireId: string;
  reason: string;
  details?: string;
}

export class ReportError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ReportError";
  }
}

// ─── Create Report ──────────────────────────────────────────

export async function createReport(input: CreateReportInput): Promise<Report> {
  const { reporterId, postId, commentId, campfireId, reason, details } = input;

  if (!postId && !commentId) {
    throw new ReportError(
      "Must report either a post or a comment",
      "INVALID_TARGET",
      400,
    );
  }

  // Prevent duplicate reports: same user + same target within 24 hours
  const duplicateCheck = postId
    ? await queryOne<{ id: string }>(
        `SELECT id FROM reports
         WHERE reporter_id = $1 AND post_id = $2
           AND deleted_at IS NULL
           AND created_at > now() - INTERVAL '24 hours'
         LIMIT 1`,
        [reporterId, postId],
      )
    : await queryOne<{ id: string }>(
        `SELECT id FROM reports
         WHERE reporter_id = $1 AND comment_id = $2
           AND deleted_at IS NULL
           AND created_at > now() - INTERVAL '24 hours'
         LIMIT 1`,
        [reporterId, commentId],
      );

  if (duplicateCheck) {
    throw new ReportError(
      "You have already reported this content recently",
      "DUPLICATE_REPORT",
      409,
    );
  }

  const report = await queryOne<Report>(
    `INSERT INTO reports (reporter_id, campfire_id, post_id, comment_id, reason, details)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [reporterId, campfireId, postId ?? null, commentId ?? null, reason, details ?? null],
  );

  if (!report) {
    throw new ReportError("Failed to create report", "CREATE_FAILED", 500);
  }

  return report;
}

// ─── Get Reports by User ────────────────────────────────────

export async function getReportsByUser(
  userId: string,
  limit = 25,
  offset = 0,
): Promise<{ reports: Report[]; total: number }> {
  const reports = await queryAll<Report>(
    `SELECT * FROM reports
     WHERE reporter_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count FROM reports
     WHERE reporter_id = $1 AND deleted_at IS NULL`,
    [userId],
  );

  return {
    reports,
    total: parseInt(countResult?.count ?? "0", 10),
  };
}

// ─── Get Reports by Campfire (admin view, future) ───────────

export async function getReportsByCampfire(
  campfireId: string,
  status?: string,
  limit = 25,
  offset = 0,
): Promise<{ reports: Report[]; total: number }> {
  const conditions = ["campfire_id = $1", "deleted_at IS NULL"];
  const params: unknown[] = [campfireId];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  params.push(limit, offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const reports = await queryAll<Report>(
    `SELECT * FROM reports
     WHERE ${conditions.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params,
  );

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count FROM reports
     WHERE ${conditions.join(" AND ")}`,
    params.slice(0, -2),
  );

  return {
    reports,
    total: parseInt(countResult?.count ?? "0", 10),
  };
}
