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
  if (!process.env.ANTHROPIC_API_KEY) {
    return { name: "anthropic_api", status: "unhealthy", details: { reason: "api_key_missing" } };
  }
  // Lightweight check — just verify the key format is plausible
  const keyValid = process.env.ANTHROPIC_API_KEY.startsWith("sk-ant-");
  return {
    name: "anthropic_api",
    status: keyValid ? "healthy" : "degraded",
    details: { key_configured: true, key_format_valid: keyValid },
  };
}

function checkEnvironment(): HealthCheck {
  const required = ["DATABASE_URL", "JWT_SECRET", "IP_SALT"];
  const missing = required.filter((k) => !process.env[k]);
  return {
    name: "environment",
    status: missing.length === 0 ? "healthy" : "unhealthy",
    details: { missing_vars: missing.length > 0 ? missing : undefined },
  };
}

export async function GET() {
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
