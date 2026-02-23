/**
 * Structured JSON logger for fuega.ai.
 * Outputs JSON lines to stdout/stderr — Railway captures these automatically.
 * No external dependencies — uses console with structured formatting.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatEntry(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: "fuega",
    ...meta,
  };
}

function emit(entry: LogEntry): void {
  const line = JSON.stringify(entry);
  if (entry.level === "error") {
    console.error(line);
  } else if (entry.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("debug")) emit(formatEntry("debug", message, meta));
  },

  info(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("info")) emit(formatEntry("info", message, meta));
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("warn")) emit(formatEntry("warn", message, meta));
  },

  error(message: string, meta?: Record<string, unknown>): void {
    if (shouldLog("error")) emit(formatEntry("error", message, meta));
  },

  /** Log with explicit level */
  log(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>
  ): void {
    if (shouldLog(level)) emit(formatEntry(level, message, meta));
  },

  /** Create a child logger with default metadata */
  child(defaultMeta: Record<string, unknown>) {
    return {
      debug: (msg: string, meta?: Record<string, unknown>) =>
        logger.debug(msg, { ...defaultMeta, ...meta }),
      info: (msg: string, meta?: Record<string, unknown>) =>
        logger.info(msg, { ...defaultMeta, ...meta }),
      warn: (msg: string, meta?: Record<string, unknown>) =>
        logger.warn(msg, { ...defaultMeta, ...meta }),
      error: (msg: string, meta?: Record<string, unknown>) =>
        logger.error(msg, { ...defaultMeta, ...meta }),
    };
  },
};
