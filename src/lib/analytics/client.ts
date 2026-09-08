import { getPublicEnv } from "@/config/env";
import { isFeatureEnabled } from "@/config/feature-flags";
import { createLogger } from "@/lib/logging/logger";

export type AnalyticsEventName =
  | "page_view"
  | "search_performed"
  | "search_result_clicked"
  | "cta_clicked"
  | "error_boundary"
  | "feature_flag_evaluated";

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export interface AnalyticsClient {
  track(event: AnalyticsEventName, props?: AnalyticsProps): Promise<void>;
  identify(userId: string, traits?: AnalyticsProps): Promise<void>;
}

const log = createLogger({ module: "analytics" });

class NoopAnalytics implements AnalyticsClient {
  async track() {}
  async identify() {}
}

class ConsoleAnalytics implements AnalyticsClient {
  async track(event: AnalyticsEventName, props?: AnalyticsProps) {
    log.info("analytics_event", { event, ...props });
  }
  async identify(userId: string, traits?: AnalyticsProps) {
    log.info("analytics_identify", { userId, ...traits });
  }
}

let client: AnalyticsClient | null = null;

export function getAnalytics(): AnalyticsClient {
  if (client) return client;

  const enabled =
    isFeatureEnabled("analyticsEnabled") || getPublicEnv().NEXT_PUBLIC_ENABLE_ANALYTICS;

  client = enabled ? new ConsoleAnalytics() : new NoopAnalytics();
  return client;
}

/** Swap implementation later (Segment, PostHog, etc.) without touching callers. */
export function setAnalyticsClient(next: AnalyticsClient) {
  client = next;
}
