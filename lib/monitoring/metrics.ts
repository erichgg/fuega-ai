/**
 * In-memory application metrics collector for fuega.ai.
 * Tracks counters, gauges, and histograms without external dependencies.
 * Metrics are exposed via /api/monitoring/metrics for Railway dashboards.
 */

import { logger } from "./logger";

interface CounterMetric {
  type: "counter";
  value: number;
  labels: Record<string, string>;
}

interface GaugeMetric {
  type: "gauge";
  value: number;
  labels: Record<string, string>;
}

interface HistogramMetric {
  type: "histogram";
  count: number;
  sum: number;
  buckets: Record<string, number>;
  labels: Record<string, string>;
}

type Metric = CounterMetric | GaugeMetric | HistogramMetric;

const metrics = new Map<string, Metric>();
const startTime = Date.now();

const DEFAULT_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

function key(name: string, labels: Record<string, string>): string {
  const sortedLabels = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
  return sortedLabels ? `${name}{${sortedLabels}}` : name;
}

export const metricsCollector = {
  /** Increment a counter */
  increment(
    name: string,
    labels: Record<string, string> = {},
    amount = 1
  ): void {
    const k = key(name, labels);
    const existing = metrics.get(k);
    if (existing && existing.type === "counter") {
      existing.value += amount;
    } else {
      metrics.set(k, { type: "counter", value: amount, labels });
    }
  },

  /** Set a gauge value */
  gauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const k = key(name, labels);
    metrics.set(k, { type: "gauge", value, labels });
  },

  /** Record a histogram observation (e.g., latency in ms) */
  observe(
    name: string,
    value: number,
    labels: Record<string, string> = {},
    buckets: number[] = DEFAULT_BUCKETS
  ): void {
    const k = key(name, labels);
    const existing = metrics.get(k);
    if (existing && existing.type === "histogram") {
      existing.count += 1;
      existing.sum += value;
      for (const bucket of buckets) {
        const bucketKey = String(bucket);
        if (value <= bucket) {
          existing.buckets[bucketKey] = (existing.buckets[bucketKey] ?? 0) + 1;
        }
      }
    } else {
      const bucketMap: Record<string, number> = {};
      for (const bucket of buckets) {
        bucketMap[String(bucket)] = value <= bucket ? 1 : 0;
      }
      metrics.set(k, {
        type: "histogram",
        count: 1,
        sum: value,
        buckets: bucketMap,
        labels,
      });
    }
  },

  /** Measure async operation latency */
  async time<T>(
    name: string,
    fn: () => Promise<T>,
    labels: Record<string, string> = {}
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.observe(name, Date.now() - start, { ...labels, status: "success" });
      return result;
    } catch (err) {
      this.observe(name, Date.now() - start, { ...labels, status: "error" });
      throw err;
    }
  },

  /** Get all metrics as a snapshot */
  snapshot(): {
    uptime_seconds: number;
    collected_at: string;
    metrics: Record<string, Metric>;
  } {
    const result: Record<string, Metric> = {};
    for (const [k, v] of Array.from(metrics.entries())) {
      result[k] = { ...v };
    }
    return {
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      collected_at: new Date().toISOString(),
      metrics: result,
    };
  },

  /** Reset all metrics (for testing) */
  reset(): void {
    metrics.clear();
  },
};

/** Pre-defined metric names for consistency */
export const METRIC = {
  HTTP_REQUESTS: "http_requests_total",
  HTTP_LATENCY: "http_request_duration_ms",
  DB_QUERIES: "db_queries_total",
  DB_LATENCY: "db_query_duration_ms",
  DB_ERRORS: "db_errors_total",
  AI_MODERATION_REQUESTS: "ai_moderation_requests_total",
  AI_MODERATION_LATENCY: "ai_moderation_duration_ms",
  AI_MODERATION_DECISIONS: "ai_moderation_decisions_total",
  AUTH_LOGINS: "auth_logins_total",
  AUTH_FAILURES: "auth_failures_total",
  RATE_LIMIT_HITS: "rate_limit_hits_total",
  POSTS_CREATED: "posts_created_total",
  COMMENTS_CREATED: "comments_created_total",
  VOTES_CAST: "votes_cast_total",
  ACTIVE_CONNECTIONS: "db_active_connections",
} as const;

// Log metrics summary every 5 minutes in production
if (process.env.NODE_ENV === "production") {
  setInterval(
    () => {
      const snap = metricsCollector.snapshot();
      const metricCount = Object.keys(snap.metrics).length;
      if (metricCount > 0) {
        logger.info("metrics_summary", {
          uptime_seconds: snap.uptime_seconds,
          metric_count: metricCount,
        });
      }
    },
    5 * 60 * 1000
  );
}
