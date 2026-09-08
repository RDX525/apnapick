export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly expose: boolean;
  readonly details?: unknown;

  constructor(input: {
    message: string;
    code?: string;
    status?: number;
    expose?: boolean;
    details?: unknown;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "AppError";
    this.code = input.code ?? "APP_ERROR";
    this.status = input.status ?? 500;
    this.expose = input.expose ?? this.status < 500;
    this.details = input.details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toErrorResponse(error: unknown): {
  status: number;
  body: { error: string; code: string; details?: unknown };
} {
  if (isAppError(error)) {
    return {
      status: error.status,
      body: {
        error: error.expose ? error.message : "Internal server error",
        code: error.code,
        details: error.expose ? error.details : undefined,
      },
    };
  }

  return {
    status: 500,
    body: { error: "Internal server error", code: "INTERNAL_ERROR" },
  };
}
