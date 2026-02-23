import { collectDbStats } from "@/lib/monitoring/db-monitor";

export const dynamic = "force-dynamic";

/**
 * GET /api/monitoring/db-stats
 * Returns database statistics (connections, sizes, slow queries).
 * Protected by MONITORING_SECRET — always required.
 */
export async function GET(req: Request) {
  const secret = process.env.MONITORING_SECRET;
  if (!secret) {
    return Response.json({ error: "Monitoring not configured", code: "NOT_CONFIGURED" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const stats = await collectDbStats();
    return Response.json(stats);
  } catch {
    return Response.json(
      { error: "Failed to collect database stats", code: "DB_STATS_ERROR" },
      { status: 500 }
    );
  }
}
