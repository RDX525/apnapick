import type {
  AdminPayment,
  AdminSeoPage,
  AdminSubscription,
  AdminWorkspace,
} from "@/domain/admin/types";

const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
] as const;

const PAYMENT_STATUSES = ["pending", "succeeded", "failed", "refunded"] as const;

type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type AdminSearchRow = {
  normalized_query?: unknown;
  hit_count?: unknown;
  last_seen_at?: unknown;
};

export type AdminSearchEventRow = {
  normalized_query?: unknown;
  coarse_area_slug?: unknown;
  created_at?: unknown;
};

function relatedRecord(relation: unknown): Record<string, unknown> | null {
  const value = Array.isArray(relation) ? relation[0] : relation;
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asSubscriptionStatus(value: string): SubscriptionStatus {
  return SUBSCRIPTION_STATUSES.includes(value as SubscriptionStatus)
    ? (value as SubscriptionStatus)
    : "expired";
}

function asPaymentStatus(value: string): PaymentStatus {
  return PAYMENT_STATUSES.includes(value as PaymentStatus)
    ? (value as PaymentStatus)
    : "pending";
}

/**
 * Live admin search analytics: keep popular + recently seen queries, and
 * attach the latest coarse area from search_events (never precise GPS).
 */
export function buildAdminSearchAnalytics(
  searches: readonly AdminSearchRow[],
  events: readonly AdminSearchEventRow[],
): AdminWorkspace["searchAnalytics"] {
  const latestArea = new Map<string, { area: string | null; at: number }>();
  for (const event of events) {
    const query = text(event.normalized_query);
    if (!query) continue;
    const at = Date.parse(String(event.created_at ?? ""));
    if (!Number.isFinite(at)) continue;
    const previous = latestArea.get(query);
    if (previous && previous.at >= at) continue;
    const area = text(event.coarse_area_slug) || null;
    latestArea.set(query, { area, at });
  }

  const byQuery = new Map<string, AdminWorkspace["searchAnalytics"][number]>();
  for (const row of searches) {
    const query = text(row.normalized_query);
    if (!query) continue;
    const lastSeen = String(row.last_seen_at ?? "");
    const count = Number(row.hit_count ?? 0);
    const existing = byQuery.get(query);
    const lastSeenMs = Date.parse(lastSeen);
    const existingSeenMs = existing ? Date.parse(existing.lastSeen) : Number.NaN;
    const newer =
      Number.isFinite(lastSeenMs) &&
      (!Number.isFinite(existingSeenMs) || lastSeenMs > existingSeenMs);
    byQuery.set(query, {
      query,
      count: Math.max(existing?.count ?? 0, count),
      area: latestArea.get(query)?.area ?? null,
      lastSeen: newer || !existing ? lastSeen : existing.lastSeen,
    });
  }

  for (const [query, info] of latestArea) {
    if (byQuery.has(query)) continue;
    byQuery.set(query, {
      query,
      count: 1,
      area: info.area,
      lastSeen: new Date(info.at).toISOString(),
    });
  }

  return [...byQuery.values()].sort((a, b) => {
    const delta = Date.parse(b.lastSeen) - Date.parse(a.lastSeen);
    if (Number.isFinite(delta) && delta !== 0) return delta;
    return b.count - a.count;
  });
}

export function mapAdminSeoPages(rows: readonly unknown[]): AdminSeoPage[] {
  return rows.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      id: String(row.id),
      path: String(row.path ?? ""),
      title: String(row.title ?? row.path ?? "Untitled"),
      indexable: Boolean(row.indexable),
      businessCount: Number(row.business_count ?? 0),
    };
  });
}

export function mapAdminSubscriptions(rows: readonly unknown[]): AdminSubscription[] {
  return rows.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const plan = relatedRecord(row.plans);
    const business = relatedRecord(row.businesses);
    const name = text(business?.name) || text(business?.display_name);
    return {
      id: String(row.id),
      businessName: name || "Unknown business",
      plan: text(plan?.name) || "Unknown",
      status: asSubscriptionStatus(String(row.status ?? "").toLowerCase()),
      amountCents: Number(plan?.price_cents ?? 0),
      renewsAt: (row.current_period_end as string | null) ?? null,
    };
  });
}

export function mapAdminPayments(rows: readonly unknown[]): AdminPayment[] {
  return rows.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const business = relatedRecord(row.businesses);
    const name = text(business?.name) || text(business?.display_name);
    return {
      id: String(row.id),
      businessName: name || "Unknown business",
      amountCents: Number(row.amount_cents ?? 0),
      status: asPaymentStatus(String(row.status ?? "").toLowerCase()),
      createdAt: String(row.created_at ?? ""),
    };
  });
}
