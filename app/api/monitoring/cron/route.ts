import {
  cleanupIpHashes,
  cleanupOldNotifications,
  checkBadgeEligibility,
  collectDbMetrics,
} from "@/lib/monitoring/cron-jobs";
import { logger } from "@/lib/monitoring/logger";
import type { CronResult } from "@/lib/monitoring/cron-jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const JOBS: Record<string, () => Promise<CronResult>> = {
  ip_hash_cleanup: cleanupIpHashes,
  notification_cleanup: cleanupOldNotifications,
  badge_eligibility: checkBadgeEligibility,
  db_metrics: collectDbMetrics,
};

/**
 * POST /api/monitoring/cron?job=<job_name>
 * Trigger a specific cron job. Protected by CRON_SECRET.
 * If no job specified, runs all jobs sequentially.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  const { searchParams } = new URL(req.url);
  const jobName = searchParams.get("job");

  if (jobName) {
    const jobFn = JOBS[jobName];
    if (!jobFn) {
      return Response.json(
        { error: `Unknown job: ${jobName}`, code: "UNKNOWN_JOB", available: Object.keys(JOBS) },
        { status: 400 }
      );
    }
    const result = await jobFn();
    return Response.json(result, { status: result.success ? 200 : 500 });
  }

  // Run all jobs
  const results: CronResult[] = [];
  for (const [name, fn] of Object.entries(JOBS)) {
    logger.info("cron_job_starting", { job: name });
    const result = await fn();
    results.push(result);
  }

  const allSuccess = results.every((r) => r.success);
  return Response.json({ results }, { status: allSuccess ? 200 : 207 });
}
