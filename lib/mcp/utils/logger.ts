/**
 * MCP Logger Utility
 * Provides structured logging with PII sanitization
 * Implements best practices for both STDIO and HTTP transports
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
  };
}

class MCPLogger {
  private isStdio: boolean;
  private logLevel: LogLevel;
  private sensitivePatterns: RegExp[] = [
    /bearer\s+[\w\-_]+/gi,
    /api[_-]?key[\s=:]+[\w\-_]+/gi,
    /authorization[\s=:]+[\w\-_]+/gi,
    /password[\s=:]+[\S]+/gi,
    /token[\s=:]+[\S]+/gi,
    /secret[\s=:]+[\S]+/gi,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    /\b(?:\d{1,5}[.-]?){3}\d{1,5}\b/g, // IP addresses
    /\b\d{16,19}\b/g, // Credit card-like numbers
  ];

  constructor(isStdio: boolean = true, logLevel: LogLevel = "info") {
    this.isStdio = isStdio;
    this.logLevel = logLevel;
  }

  /**
   * Sanitize sensitive information from logs
   */
  private sanitize(value: unknown): unknown {
    if (typeof value === "string") {
      let sanitized = value;
      for (const pattern of this.sensitivePatterns) {
        sanitized = sanitized.replace(pattern, "[REDACTED]");
      }
      return sanitized;
    }

    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        return value.map((item) => this.sanitize(item));
      }
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(
        value as Record<string, unknown>
      )) {
        // Redact sensitive keys
        if (
          /^(password|token|secret|api[_-]?key|authorization|bearer)$/i.test(
            key
          )
        ) {
          sanitized[key] = "[REDACTED]";
        } else {
          sanitized[key] = this.sanitize(val);
        }
      }
      return sanitized;
    }

    return value;
  }

  /**
   * Format log entry for output
   */
  private formatEntry(entry: LogEntry): string {
    const sanitizedContext = entry.context
      ? (this.sanitize(entry.context) as Record<string, unknown>)
      : undefined;

    if (this.isStdio) {
      // For STDIO: JSON format for structured logging
      return JSON.stringify({
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        ...(sanitizedContext && { context: sanitizedContext }),
        ...(entry.error && { error: entry.error }),
      });
    } else {
      // For HTTP: human-readable format
      let formatted = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${
        entry.message
      }`;
      if (sanitizedContext) {
        formatted += ` ${JSON.stringify(sanitizedContext)}`;
      }
      if (entry.error) {
        formatted += ` Error: ${entry.error.message}`;
        if (entry.error.stack) {
          formatted += `\n${entry.error.stack}`;
        }
      }
      return formatted;
    }
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  /**
   * Output log (respects transport type)
   */
  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const formatted = this.formatEntry(entry);

    if (this.isStdio) {
      // STDIO: MUST use console.error for logs, NEVER console.log
      // This ensures logs go to stderr, not stdout (which is reserved for protocol)
      if (entry.level === "error" || entry.level === "warn") {
        console.error(formatted);
      } else {
        console.error(formatted); // All logs to stderr in STDIO mode
      }
    } else {
      // HTTP: console.log is acceptable
      console.log(formatted);
    }
  }

  /**
   * Log at debug level
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: "debug",
      message,
      context: context
        ? (this.sanitize(context) as Record<string, unknown>)
        : undefined,
    });
  }

  /**
   * Log at info level
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: "info",
      message,
      context: context
        ? (this.sanitize(context) as Record<string, unknown>)
        : undefined,
    });
  }

  /**
   * Log at warn level
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: "warn",
      message,
      context: context
        ? (this.sanitize(context) as Record<string, unknown>)
        : undefined,
    });
  }

  /**
   * Log at error level with optional error object
   */
  error(
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: "error",
      message,
      context: context
        ? (this.sanitize(context) as Record<string, unknown>)
        : undefined,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, unknown>) {
    return {
      debug: (message: string, ctx?: Record<string, unknown>) => {
        const merged = ctx ? { ...context, ...ctx } : context;
        this.debug(message, merged);
      },
      info: (message: string, ctx?: Record<string, unknown>) => {
        const merged = ctx ? { ...context, ...ctx } : context;
        this.info(message, merged);
      },
      warn: (message: string, ctx?: Record<string, unknown>) => {
        const merged = ctx ? { ...context, ...ctx } : context;
        this.warn(message, merged);
      },
      error: (
        message: string,
        ctx?: Record<string, unknown>,
        error?: Error
      ) => {
        const merged = ctx ? { ...context, ...ctx } : context;
        this.error(message, merged, error);
      },
    };
  }
}

// Export singleton instances
export const stdioLogger = new MCPLogger(true, "debug");
export const httpLogger = new MCPLogger(false, "info");

export default MCPLogger;
