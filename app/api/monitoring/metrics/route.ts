import { metricsCollector } from "@/lib/monitoring/metrics";

export const dynamic = "force-dynamic";

/**
 * GET /api/monitoring/metrics
 * Returns application metrics snapshot.
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
    return Response.json(metricsCollector.snapshot());
  } catch {
    return Response.json({ error: "Failed to collect metrics", code: "METRICS_ERROR" }, { status: 500 });
  }
}
