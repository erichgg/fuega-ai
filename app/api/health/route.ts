import { checkReadRateLimit } from "@/lib/auth/rate-limit";
import { hashIp, getClientIp } from "@/lib/auth/ip-hash";
import { checkDbHealth, getPoolStats } from "@/lib/monitoring/db-monitor";
import { logger } from "@/lib/monitoring/logger";

export const dynamic = "force-dynamic";

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latency_ms?: number;
  details?: Record<string, unknown>;
}

async function checkDatabase(): Promise<HealthCheck> {
  const { healthy, latency_ms } = await checkDbHealth();
  const poolStats = getPoolStats();
  return {
    name: "database",
    status: healthy ? (latency_ms > 500 ? "degraded" : "healthy") : "unhealthy",
    latency_ms,
    details: {
      pool_total: poolStats.total,
      pool_idle: poolStats.idle,
      pool_waiting: poolStats.waiting,
    },
  };
}

async function checkAnthropicApi(): Promise<HealthCheck> {
  const keyConfigured = !!process.env.ANTHROPIC_API_KEY;
  return {
    name: "anthropic_api",
    status: keyConfigured ? "healthy" : "unhealthy",
  };
}

function checkEnvironment(): HealthCheck {
  const required = ["DATABASE_URL", "JWT_SECRET", "IP_SALT"];
  const missingCount = required.filter((k) => !process.env[k]).length;
  return {
    name: "environment",
    status: missingCount === 0 ? "healthy" : "unhealthy",
  };
}

/**
 * Verify the MONITORING_SECRET header for detailed health checks.
 */
function isMonitoringAuthorized(req: Request): boolean {
  const secret = process.env.MONITORING_SECRET;
  if (!secret) return false;
  const header = req.headers.get("x-monitoring-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  return header === secret;
}

/**
 * GET /api/health
 *
 * Public: returns { status: "ok" }
 * With valid MONITORING_SECRET header: returns detailed checks including
 * pool stats, env var status, and API key status.
 */
export async function GET(req: Request) {
  const ipHash = hashIp(getClientIp(req));
  const rateLimit = await checkReadRateLimit(ipHash);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many requests. Try again later.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  // Public health check — no internals exposed
  if (!isMonitoringAuthorized(req)) {
    return Response.json({ status: "ok" });
  }

  // Detailed health check — requires MONITORING_SECRET
  const checks: HealthCheck[] = [];

  const [db, ai] = await Promise.all([checkDatabase(), checkAnthropicApi()]);
  checks.push(db, ai, checkEnvironment());

  const overallStatus = checks.some((c) => c.status === "unhealthy")
    ? "unhealthy"
    : checks.some((c) => c.status === "degraded")
      ? "degraded"
      : "healthy";

  const httpStatus = overallStatus === "unhealthy" ? 503 : 200;

  if (overallStatus !== "healthy") {
    logger.warn("health_check_degraded", {
      status: overallStatus,
      unhealthy: checks
        .filter((c) => c.status !== "healthy")
        .map((c) => c.name),
    });
  }

  return Response.json(
    {
      status: overallStatus,
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: httpStatus }
  );
}
