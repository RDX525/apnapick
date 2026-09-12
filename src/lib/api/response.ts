import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors/app-error";
import { createLogger } from "@/lib/logging/logger";
import { createRequestId, reportException } from "@/lib/observability/report-error";

const log = createLogger({ module: "api" });

function withRequestId(init: ResponseInit | undefined, requestId: string) {
  const headers = new Headers(init?.headers);
  headers.set("x-request-id", requestId);
  return headers;
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  const requestId = createRequestId();
  return NextResponse.json(data, {
    ...init,
    headers: withRequestId(init, requestId),
  });
}

export function jsonError(error: unknown, init?: ResponseInit) {
  const requestId = createRequestId();
  const mapped = toErrorResponse(error);
  const cause =
    error instanceof Error && error.cause != null
      ? error.cause instanceof Error
        ? error.cause.message
        : typeof error.cause === "object" &&
            error.cause &&
            "message" in error.cause
          ? String((error.cause as { message?: unknown }).message ?? error.cause)
          : String(error.cause)
      : undefined;
  log.error("api_error", {
    requestId,
    status: mapped.status,
    code: mapped.body.code,
    message: error instanceof Error ? error.message : String(error),
    cause,
  });
  if (mapped.status >= 500) {
    reportException(error, { requestId, code: mapped.body.code, status: mapped.status });
  }
  return NextResponse.json(
    { ...mapped.body, requestId },
    {
      ...init,
      status: mapped.status,
      headers: withRequestId(init, requestId),
    },
  );
}
