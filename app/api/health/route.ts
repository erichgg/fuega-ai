import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {
    database: "unknown",
  };

  try {
    await pool.query("SELECT 1");
    checks.database = "connected";
  } catch {
    checks.database = "disconnected";
  }

  return Response.json({
    status: "ok",
    ...checks,
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
}
