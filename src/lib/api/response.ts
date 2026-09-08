import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors/app-error";
import { createLogger } from "@/lib/logging/logger";

const log = createLogger({ module: "api" });

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(error: unknown, init?: ResponseInit) {
  const mapped = toErrorResponse(error);
  log.error("api_error", {
    status: mapped.status,
    code: mapped.body.code,
    message: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json(mapped.body, {
    ...init,
    status: mapped.status,
    headers: init?.headers,
  });
}
