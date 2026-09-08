import type { SubscriptionStatus } from "@/domain/billing/types";

export function mapStripeSubscriptionStatus(
  status: string | null | undefined,
): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "unpaid":
    case "incomplete_expired":
      return "EXPIRED";
    case "incomplete":
    case "paused":
      return "PAST_DUE";
    default:
      return "EXPIRED";
  }
}

export function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function ts(seconds: unknown): string | null {
  const n = num(seconds);
  if (n == null) return null;
  return new Date(n * 1000).toISOString();
}

export function meta(obj: Record<string, unknown>): Record<string, string> {
  const m = obj.metadata;
  if (!m || typeof m !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(m as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}
