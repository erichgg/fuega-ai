/**
 * Alerting system for fuega.ai.
 * Sends alerts via webhook (Discord/Slack compatible) when thresholds are breached.
 * Also logs alerts to structured logger for Railway log aggregation.
 */

import { logger } from "./logger";
import { metricsCollector } from "./metrics";

const alertLogger = logger.child({ component: "alerts" });

export type AlertSeverity = "warning" | "critical";

export interface AlertRule {
  name: string;
  description: string;
  severity: AlertSeverity;
  check: () => Promise<AlertCheckResult>;
}

export interface AlertCheckResult {
  triggered: boolean;
  value: number;
  threshold: number;
  message: string;
}

interface WebhookPayload {
  content: string;
  embeds?: Array<{
    title: string;
    description: string;
    color: number;
    fields: Array<{ name: string; value: string; inline: boolean }>;
    timestamp: string;
  }>;
}

const SEVERITY_COLORS: Record<AlertSeverity, number> = {
  warning: 0xffa500,  // orange
  critical: 0xff0000, // red
};

// In-memory alert state to prevent spam
const lastAlertTimes = new Map<string, number>();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between repeated alerts

/** Send a webhook notification (Discord/Slack format) */
async function sendWebhook(payload: WebhookPayload): Promise<boolean> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) {
    alertLogger.warn("alert_webhook_not_configured");
    return false;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      alertLogger.error("alert_webhook_failed", {
        status: response.status,
        statusText: response.statusText,
      });
      return false;
    }

    return true;
  } catch (err) {
    alertLogger.error("alert_webhook_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/** Fire an alert — logs it and sends webhook if configured */
export async function fireAlert(
  rule: string,
  severity: AlertSeverity,
  result: AlertCheckResult
): Promise<void> {
  // Check cooldown
  const lastTime = lastAlertTimes.get(rule);
  if (lastTime && Date.now() - lastTime < COOLDOWN_MS) {
    return;
  }
  lastAlertTimes.set(rule, Date.now());

  // Log the alert
  const logMethod = severity === "critical" ? "error" : "warn";
  alertLogger[logMethod]("alert_fired", {
    rule,
    severity,
    value: result.value,
    threshold: result.threshold,
    message: result.message,
  });

  metricsCollector.increment("alerts_fired_total", { rule, severity });

  // Send webhook
  await sendWebhook({
    content:
      severity === "critical"
        ? "@here CRITICAL ALERT"
        : "Warning Alert",
    embeds: [
      {
        title: `${severity === "critical" ? "🔴" : "🟠"} ${rule}`,
        description: result.message,
        color: SEVERITY_COLORS[severity],
        fields: [
          { name: "Current Value", value: String(result.value), inline: true },
          { name: "Threshold", value: String(result.threshold), inline: true },
          {
            name: "Environment",
            value: process.env.RAILWAY_ENVIRONMENT ?? "unknown",
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

/** Built-in alert rules */
export const ALERT_RULES: AlertRule[] = [
  {
    name: "high_db_connections",
    description: "Database connections exceed 80% of max",
    severity: "warning",
    check: async () => {
      const { pool } = await import("@/lib/db");
      const total = pool.totalCount;
      const max = 20; // matches pool config
      const pct = (total / max) * 100;
      return {
        triggered: pct > 80,
        value: Math.round(pct),
        threshold: 80,
        message: `Database pool usage at ${Math.round(pct)}% (${total}/${max} connections)`,
      };
    },
  },
  {
    name: "high_error_rate",
    description: "Error rate exceeds 1%",
    severity: "critical",
    check: async () => {
      const snapshot = metricsCollector.snapshot();
      let totalRequests = 0;
      let errorRequests = 0;

      for (const [key, metric] of Object.entries(snapshot.metrics)) {
        if (key.startsWith("http_requests_total") && metric.type === "counter") {
          totalRequests += metric.value;
          if (metric.labels.status?.startsWith("5")) {
            errorRequests += metric.value;
          }
        }
      }

      const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
      return {
        triggered: errorRate > 1 && totalRequests > 100,
        value: Math.round(errorRate * 100) / 100,
        threshold: 1,
        message: `Error rate at ${errorRate.toFixed(2)}% (${errorRequests}/${totalRequests} requests)`,
      };
    },
  },
  {
    name: "slow_response_time",
    description: "Average response time exceeds 1 second",
    severity: "warning",
    check: async () => {
      const snapshot = metricsCollector.snapshot();
      let totalLatency = 0;
      let totalCount = 0;

      for (const [key, metric] of Object.entries(snapshot.metrics)) {
        if (
          key.startsWith("http_request_duration_ms") &&
          metric.type === "histogram"
        ) {
          totalLatency += metric.sum;
          totalCount += metric.count;
        }
      }

      const avgLatency = totalCount > 0 ? totalLatency / totalCount : 0;
      return {
        triggered: avgLatency > 1000 && totalCount > 50,
        value: Math.round(avgLatency),
        threshold: 1000,
        message: `Average response time ${Math.round(avgLatency)}ms across ${totalCount} requests`,
      };
    },
  },
];

/** Run all alert checks */
export async function runAlertChecks(): Promise<void> {
  for (const rule of ALERT_RULES) {
    try {
      const result = await rule.check();
      if (result.triggered) {
        await fireAlert(rule.name, rule.severity, result);
      }
    } catch (err) {
      alertLogger.error("alert_check_failed", {
        rule: rule.name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
