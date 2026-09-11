import { createLogger } from "@/lib/logging/logger";

const log = createLogger({ module: "observability" });

export function createRequestId() {
  return crypto.randomUUID();
}

type SentryDsn = {
  key: string;
  host: string;
  project: string;
};

function parseSentryDsn(dsn: string): SentryDsn | null {
  try {
    const url = new URL(dsn);
    const key = url.username;
    const project = url.pathname.replace(/^\//, "").split("/")[0];
    if (!key || !url.host || !project) return null;
    return { key, host: url.host, project };
  } catch {
    return null;
  }
}

/** Fire-and-forget error report. No-ops when SENTRY_DSN is unset. */
export function reportException(error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  const parsed = parseSentryDsn(dsn);
  if (!parsed) {
    log.warn("sentry_dsn_invalid");
    return;
  }

  const eventId = crypto.randomUUID().replace(/-/g, "");
  const payload = {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    platform: "node",
    level: "error",
    logger: "apnapick",
    exception: {
      values: [
        {
          type: error instanceof Error ? error.name : "Error",
          value: message.slice(0, 2000),
        },
      ],
    },
    extra: context ?? {},
  };

  const storeUrl = `https://${parsed.host}/api/${parsed.project}/store/`;
  void fetch(storeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=apnapick/1.0, sentry_key=${parsed.key}`,
    },
    body: JSON.stringify(payload),
  }).catch((sendError: unknown) => {
    log.warn("sentry_report_failed", {
      message: sendError instanceof Error ? sendError.message : String(sendError),
    });
  });
}
