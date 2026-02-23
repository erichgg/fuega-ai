import { runAlertChecks, ALERT_RULES } from "@/lib/monitoring/alerts";

export const dynamic = "force-dynamic";

/**
 * GET /api/monitoring/alerts
 * List configured alert rules.
 */
export async function GET(req: Request) {
  const secret = process.env.MONITORING_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  return Response.json({
    rules: ALERT_RULES.map((r) => ({
      name: r.name,
      description: r.description,
      severity: r.severity,
    })),
  });
}

/**
 * POST /api/monitoring/alerts
 * Run all alert checks manually. Protected by CRON_SECRET.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  await runAlertChecks();
  return Response.json({ status: "checked", timestamp: new Date().toISOString() });
}
