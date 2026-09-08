export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(context: LogContext): Logger;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL;
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function serialize(context?: LogContext) {
  if (!context) return undefined;
  const safe: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (
      /secret|password|token|authorization|service.?role/i.test(key) &&
      typeof value === "string"
    ) {
      safe[key] = "[redacted]";
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

class ConsoleLogger implements Logger {
  constructor(
    private readonly base: LogContext = {},
    private readonly minLevel: LogLevel = resolveLevel(),
  ) {}

  private write(level: LogLevel, message: string, context?: LogContext) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) return;
    const payload = {
      level,
      message,
      time: new Date().toISOString(),
      ...serialize({ ...this.base, ...context }),
    };
    const line = JSON.stringify(payload);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.info(line);
  }

  debug(message: string, context?: LogContext) {
    this.write("debug", message, context);
  }
  info(message: string, context?: LogContext) {
    this.write("info", message, context);
  }
  warn(message: string, context?: LogContext) {
    this.write("warn", message, context);
  }
  error(message: string, context?: LogContext) {
    this.write("error", message, context);
  }
  child(context: LogContext): Logger {
    return new ConsoleLogger({ ...this.base, ...context }, this.minLevel);
  }
}

export const logger: Logger = new ConsoleLogger({ service: "apnapick" });

export function createLogger(context: LogContext): Logger {
  return logger.child(context);
}
