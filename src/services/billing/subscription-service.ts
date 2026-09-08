import "server-only";

import { createAdminClient } from "@/lib/db/supabase-admin";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { hasServiceRoleKey, hasSupabaseConfig } from "@/config/env";
import { parsePlanFeatures, isPlanCode } from "@/config/billing-plans";
import { PLAN_CATALOG } from "@/config/billing-plans";
import type {
  Plan,
  PlanCode,
  PlanFeatureKey,
  PlanFeatures,
  Subscription,
  SubscriptionStatus,
} from "@/domain/billing/types";
import { DEFAULT_FREE_FEATURES } from "@/domain/billing/types";
import { hasEntitlement } from "@/domain/billing/entitlements";
import { AppError } from "@/lib/errors/app-error";

export { hasEntitlement };

function mapPlan(row: Record<string, unknown>): Plan {
  const code = String(row.code);
  return {
    id: String(row.id),
    code: isPlanCode(code) ? code : "free",
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    priceCents: Number(row.price_cents ?? 0),
    currency: String(row.currency ?? "INR"),
    interval: row.interval === "year" ? "year" : "month",
    features: parsePlanFeatures(row.features),
    externalPriceId: (row.external_price_id as string | null) ?? null,
    isActive: Boolean(row.is_active ?? true),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function catalogAsPlans(): Plan[] {
  return (Object.keys(PLAN_CATALOG) as PlanCode[]).map((code, i) => ({
    id: `catalog-${code}`,
    code,
    name: PLAN_CATALOG[code].name,
    description: PLAN_CATALOG[code].description,
    priceCents: PLAN_CATALOG[code].priceCents,
    currency: "INR",
    interval: "month" as const,
    features: PLAN_CATALOG[code].features,
    externalPriceId: null,
    isActive: true,
    sortOrder: i * 10,
  }));
}

export async function listPlans(): Promise<Plan[]> {
  if (!hasSupabaseConfig()) return catalogAsPlans();

  const supabase = hasServiceRoleKey()
    ? createAdminClient()
    : await createServerSupabaseClient();
  if (!supabase) return catalogAsPlans();

  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data?.length) return catalogAsPlans();
  return data.map((row) => mapPlan(row as Record<string, unknown>));
}

export async function getPlanByCode(code: PlanCode): Promise<Plan | null> {
  const plans = await listPlans();
  return plans.find((p) => p.code === code) ?? null;
}

const ACTIVE_STATUSES: SubscriptionStatus[] = ["TRIALING", "ACTIVE", "PAST_DUE"];

export async function getActiveSubscription(
  businessId: string,
): Promise<Subscription | null> {
  if (!hasSupabaseConfig()) return null;

  const supabase = hasServiceRoleKey()
    ? createAdminClient()
    : await createServerSupabaseClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("subscriptions")
    .select(
      "id, business_id, plan_id, status, current_period_start, current_period_end, cancel_at, canceled_at, external_customer_id, external_subscription_id, plans(code)",
    )
    .eq("business_id", businessId)
    .in("status", ACTIVE_STATUSES)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const planRel = data.plans as { code?: string } | { code?: string }[] | null;
  const planCodeRaw = Array.isArray(planRel) ? planRel[0]?.code : planRel?.code;
  const planCode = planCodeRaw && isPlanCode(planCodeRaw) ? planCodeRaw : "free";

  return {
    id: data.id as string,
    businessId: data.business_id as string,
    planId: data.plan_id as string,
    planCode,
    status: data.status as SubscriptionStatus,
    currentPeriodStart: (data.current_period_start as string | null) ?? null,
    currentPeriodEnd: (data.current_period_end as string | null) ?? null,
    cancelAt: (data.cancel_at as string | null) ?? null,
    canceledAt: (data.canceled_at as string | null) ?? null,
    externalCustomerId: (data.external_customer_id as string | null) ?? null,
    externalSubscriptionId: (data.external_subscription_id as string | null) ?? null,
  };
}

/**
 * Entitlements from webhook-backed subscription + plan features.
 * Defaults to FREE when no active paid subscription.
 */
export async function getBusinessEntitlements(businessId: string): Promise<{
  planCode: PlanCode;
  features: PlanFeatures;
  subscription: Subscription | null;
}> {
  const sub = await getActiveSubscription(businessId);
  if (!sub) {
    return {
      planCode: "free",
      features: { ...DEFAULT_FREE_FEATURES },
      subscription: null,
    };
  }

  const plan = await getPlanByCode(sub.planCode);
  return {
    planCode: sub.planCode,
    features: plan?.features ??
      PLAN_CATALOG[sub.planCode]?.features ?? {
        ...DEFAULT_FREE_FEATURES,
      },
    subscription: sub,
  };
}

export async function assertBusinessEntitlement(
  businessId: string,
  key: PlanFeatureKey,
): Promise<PlanFeatures> {
  const { features, planCode } = await getBusinessEntitlements(businessId);
  if (!hasEntitlement(features, key)) {
    throw new AppError({
      message: `Plan ${planCode} does not include ${key}`,
      code: "PLAN_ENTITLEMENT_REQUIRED",
      status: 402,
      expose: true,
      details: { planCode, feature: key },
    });
  }
  return features;
}

/** Resolve Stripe price id: DB column, then env map. */
export function resolvePriceId(plan: Plan): string | null {
  if (plan.externalPriceId) return plan.externalPriceId;
  const envKey =
    plan.code === "premium"
      ? process.env.STRIPE_PRICE_PREMIUM
      : plan.code === "business"
        ? process.env.STRIPE_PRICE_BUSINESS
        : null;
  return envKey || null;
}
