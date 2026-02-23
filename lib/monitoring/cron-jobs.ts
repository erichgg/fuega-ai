/**
 * Cron job definitions for fuega.ai.
 * These run via API routes triggered by Railway cron service or external scheduler.
 * Each job is idempotent and safe to re-run.
 */

import { query } from "@/lib/db";
import { logger } from "./logger";
import { metricsCollector } from "./metrics";

const cronLogger = logger.child({ component: "cron" });

export interface CronResult {
  job: string;
  success: boolean;
  affected_rows: number;
  duration_ms: number;
  error?: string;
}

/**
 * Delete IP hashes older than 30 days.
 * CRITICAL: Privacy compliance — NON-NEGOTIABLE.
 * Schedule: Daily at 3:00 AM UTC.
 */
export async function cleanupIpHashes(): Promise<CronResult> {
  const start = Date.now();
  try {
    const result = await query(
      "DELETE FROM ip_hashes WHERE created_at < NOW() - INTERVAL '30 days'"
    );
    const affected = result.rowCount ?? 0;
    cronLogger.info("ip_hash_cleanup_complete", { deleted: affected });
    metricsCollector.increment("cron_job_runs_total", {
      job: "ip_hash_cleanup",
      status: "success",
    });
    return {
      job: "ip_hash_cleanup",
      success: true,
      affected_rows: affected,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    cronLogger.error("ip_hash_cleanup_failed", { error: msg });
    metricsCollector.increment("cron_job_runs_total", {
      job: "ip_hash_cleanup",
      status: "error",
    });
    return {
      job: "ip_hash_cleanup",
      success: false,
      affected_rows: 0,
      duration_ms: Date.now() - start,
      error: msg,
    };
  }
}

/**
 * Clean up old notifications (read notifications older than 90 days).
 * Schedule: Weekly on Sunday at 4:00 AM UTC.
 */
export async function cleanupOldNotifications(): Promise<CronResult> {
  const start = Date.now();
  try {
    const result = await query(
      "UPDATE notifications SET deleted_at = NOW() WHERE read_at IS NOT NULL AND read_at < NOW() - INTERVAL '90 days' AND deleted_at IS NULL"
    );
    const affected = result.rowCount ?? 0;
    cronLogger.info("notification_cleanup_complete", { soft_deleted: affected });
    metricsCollector.increment("cron_job_runs_total", {
      job: "notification_cleanup",
      status: "success",
    });
    return {
      job: "notification_cleanup",
      success: true,
      affected_rows: affected,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    cronLogger.error("notification_cleanup_failed", { error: msg });
    metricsCollector.increment("cron_job_runs_total", {
      job: "notification_cleanup",
      status: "error",
    });
    return {
      job: "notification_cleanup",
      success: false,
      affected_rows: 0,
      duration_ms: Date.now() - start,
      error: msg,
    };
  }
}

/**
 * Check and award badges based on eligibility criteria.
 * Schedule: Hourly.
 */
export async function checkBadgeEligibility(): Promise<CronResult> {
  const start = Date.now();
  try {
    // Award "Founder" badge to users who joined before public launch
    const founderResult = await query(
      `INSERT INTO user_badges (user_id, badge_id)
       SELECT u.id, b.id
       FROM users u
       CROSS JOIN badges b
       WHERE b.slug = 'founder'
         AND u.created_at < $1
         AND NOT EXISTS (
           SELECT 1 FROM user_badges ub WHERE ub.user_id = u.id AND ub.badge_id = b.id
         )`,
      [process.env.PUBLIC_LAUNCH_DATE ?? "2027-01-01"]
    );

    // Award "First Spark" badge to users with at least 1 post that has sparks
    const sparkResult = await query(
      `INSERT INTO user_badges (user_id, badge_id)
       SELECT DISTINCT p.author_id, b.id
       FROM posts p
       CROSS JOIN badges b
       JOIN votes v ON v.post_id = p.id AND v.vote_type = 'spark'
       WHERE b.slug = 'first-spark'
         AND NOT EXISTS (
           SELECT 1 FROM user_badges ub WHERE ub.user_id = p.author_id AND ub.badge_id = b.id
         )`
    );

    const affected = (founderResult.rowCount ?? 0) + (sparkResult.rowCount ?? 0);
    cronLogger.info("badge_eligibility_check_complete", { awarded: affected });
    metricsCollector.increment("cron_job_runs_total", {
      job: "badge_eligibility",
      status: "success",
    });
    return {
      job: "badge_eligibility",
      success: true,
      affected_rows: affected,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    cronLogger.error("badge_eligibility_check_failed", { error: msg });
    metricsCollector.increment("cron_job_runs_total", {
      job: "badge_eligibility",
      status: "error",
    });
    return {
      job: "badge_eligibility",
      success: false,
      affected_rows: 0,
      duration_ms: Date.now() - start,
      error: msg,
    };
  }
}

/**
 * Collect and log database health metrics.
 * Schedule: Every 5 minutes.
 */
export async function collectDbMetrics(): Promise<CronResult> {
  const start = Date.now();
  try {
    const connResult = await query(
      "SELECT count(*) as cnt FROM pg_stat_activity WHERE state = 'active'"
    );
    const activeConns = parseInt(connResult.rows[0]?.cnt ?? "0", 10);
    metricsCollector.gauge("db_active_connections", activeConns);

    const sizeResult = await query(
      "SELECT pg_database_size(current_database()) as bytes"
    );
    const dbBytes = parseInt(sizeResult.rows[0]?.bytes ?? "0", 10);
    metricsCollector.gauge("db_size_bytes", dbBytes);

    cronLogger.info("db_metrics_collected", {
      active_connections: activeConns,
      db_size_bytes: dbBytes,
    });

    return {
      job: "db_metrics",
      success: true,
      affected_rows: 0,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    cronLogger.error("db_metrics_collection_failed", { error: msg });
    return {
      job: "db_metrics",
      success: false,
      affected_rows: 0,
      duration_ms: Date.now() - start,
      error: msg,
    };
  }
}
