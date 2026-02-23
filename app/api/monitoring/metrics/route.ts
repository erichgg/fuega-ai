import { metricsCollector } from "@/lib/monitoring/metrics";

export const dynamic = "force-dynamic";

/**
 * GET /api/monitoring/metrics
 * Returns application metrics snapshot.
 * Protected by MONITORING_SECRET in production.
 */
export async function GET(req: Request) {
  const secret = process.env.MONITORING_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  return Response.json(metricsCollector.snapshot());
}
