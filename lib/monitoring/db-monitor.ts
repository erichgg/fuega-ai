/**
 * Database monitoring for fuega.ai.
 * Runs diagnostic queries against PostgreSQL and reports to metrics/logger.
 */

import { pool, queryAll, queryOne } from "@/lib/db";
import { logger } from "./logger";
import { metricsCollector, METRIC } from "./metrics";

const dbLogger = logger.child({ component: "db-monitor" });

interface SlowQuery {
  query: string;
  mean_exec_time_ms: number;
  calls: number;
  total_exec_time_ms: number;
}

interface TableSize {
  table_name: string;
  total_size: string;
  row_estimate: number;
}

interface DbStats {
  active_connections: number;
  idle_connections: number;
  max_connections: number;
  database_size: string;
  slow_queries: SlowQuery[];
  table_sizes: TableSize[];
  uptime: string;
  cache_hit_ratio: number;
}

/** Get current connection pool stats */
export function getPoolStats(): {
  total: number;
  idle: number;
  waiting: number;
} {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

/** Get active database connections from pg_stat_activity */
async function getConnectionCounts(): Promise<{
  active: number;
  idle: number;
  max: number;
}> {
  const active = await queryOne<{ count: string }>(
    "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'"
  );
  const idle = await queryOne<{ count: string }>(
    "SELECT count(*) FROM pg_stat_activity WHERE state = 'idle'"
  );
  const maxConn = await queryOne<{ setting: string }>(
    "SHOW max_connections"
  );
  return {
    active: parseInt(active?.count ?? "0", 10),
    idle: parseInt(idle?.count ?? "0", 10),
    max: parseInt(maxConn?.setting ?? "100", 10),
  };
}

/** Get database size */
async function getDatabaseSize(): Promise<string> {
  const result = await queryOne<{ size: string }>(
    "SELECT pg_size_pretty(pg_database_size(current_database())) as size"
  );
  return result?.size ?? "unknown";
}

/** Get slow queries from pg_stat_statements if available */
async function getSlowQueries(): Promise<SlowQuery[]> {
  try {
    const rows = await queryAll<{
      query: string;
      mean_exec_time: number;
      calls: string;
      total_exec_time: number;
    }>(
      `SELECT query, mean_exec_time, calls, total_exec_time
       FROM pg_stat_statements
       ORDER BY mean_exec_time DESC
       LIMIT 10`
    );
    return rows.map((r) => ({
      query: r.query.substring(0, 200),
      mean_exec_time_ms: Math.round(r.mean_exec_time * 100) / 100,
      calls: parseInt(String(r.calls), 10),
      total_exec_time_ms: Math.round(r.total_exec_time * 100) / 100,
    }));
  } catch {
    // pg_stat_statements extension may not be enabled
    return [];
  }
}

/** Get table sizes */
async function getTableSizes(): Promise<TableSize[]> {
  const rows = await queryAll<{
    table_name: string;
    total_size: string;
    row_estimate: string;
  }>(
    `SELECT
       c.relname as table_name,
       pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
       c.reltuples::bigint as row_estimate
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'
     ORDER BY pg_total_relation_size(c.oid) DESC
     LIMIT 20`
  );
  return rows.map((r) => ({
    table_name: r.table_name,
    total_size: r.total_size,
    row_estimate: parseInt(r.row_estimate, 10),
  }));
}

/** Get server uptime */
async function getUptime(): Promise<string> {
  const result = await queryOne<{ uptime: string }>(
    "SELECT now() - pg_postmaster_start_time() as uptime"
  );
  return result?.uptime ?? "unknown";
}

/** Get cache hit ratio */
async function getCacheHitRatio(): Promise<number> {
  const result = await queryOne<{ ratio: string }>(
    `SELECT
       CASE WHEN (sum(blks_hit) + sum(blks_read)) = 0 THEN 0
       ELSE round(sum(blks_hit)::numeric / (sum(blks_hit) + sum(blks_read)) * 100, 2)
       END as ratio
     FROM pg_stat_database
     WHERE datname = current_database()`
  );
  return parseFloat(result?.ratio ?? "0");
}

/** Collect full database statistics */
export async function collectDbStats(): Promise<DbStats> {
  const [connections, dbSize, slowQueries, tableSizes, uptime, cacheHitRatio] =
    await Promise.all([
      getConnectionCounts(),
      getDatabaseSize(),
      getSlowQueries(),
      getTableSizes(),
      getUptime(),
      getCacheHitRatio(),
    ]);

  // Update metrics
  metricsCollector.gauge(METRIC.ACTIVE_CONNECTIONS, connections.active, {
    state: "active",
  });
  metricsCollector.gauge(METRIC.ACTIVE_CONNECTIONS, connections.idle, {
    state: "idle",
  });

  // Log if connections are high
  const connectionPct = (connections.active + connections.idle) / connections.max;
  if (connectionPct > 0.8) {
    dbLogger.warn("high_connection_usage", {
      active: connections.active,
      idle: connections.idle,
      max: connections.max,
      usage_pct: Math.round(connectionPct * 100),
    });
  }

  // Log if cache hit ratio is low
  if (cacheHitRatio < 95 && cacheHitRatio > 0) {
    dbLogger.warn("low_cache_hit_ratio", { ratio: cacheHitRatio });
  }

  return {
    active_connections: connections.active,
    idle_connections: connections.idle,
    max_connections: connections.max,
    database_size: dbSize,
    slow_queries: slowQueries,
    table_sizes: tableSizes,
    uptime,
    cache_hit_ratio: cacheHitRatio,
  };
}

/** Quick connectivity check — returns latency in ms */
export async function checkDbHealth(): Promise<{
  healthy: boolean;
  latency_ms: number;
}> {
  const start = Date.now();
  try {
    await pool.query("SELECT 1");
    return { healthy: true, latency_ms: Date.now() - start };
  } catch (err) {
    dbLogger.error("db_health_check_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { healthy: false, latency_ms: Date.now() - start };
  }
}
