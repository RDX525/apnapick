import type { SubscriptionStatus } from "@/domain/billing/types";

export function mapRazorpaySubscriptionStatus(
  status: string | null | undefined,
): SubscriptionStatus {
  switch (status) {
    case "created":
    case "authenticated":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "pending":
    case "halted":
    case "paused":
      return "PAST_DUE";
    case "cancelled":
    case "canceled":
      return "CANCELED";
    case "completed":
    case "expired":
      return "EXPIRED";
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
  const out: Record<string, string> = {};
  for (const source of [obj.metadata, obj.notes]) {
    if (!source || typeof source !== "object") continue;
    for (const [k, v] of Object.entries(source as Record<string, unknown>)) {
      if (typeof v === "string" && v.length > 0) out[k] = v;
    }
  }
  return out;
}
