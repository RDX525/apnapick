import type { PlanFeatures, PlanCode } from "@/domain/billing/types";
import { DEFAULT_FREE_FEATURES } from "@/domain/billing/types";

/** Paid Razorpay checkout is off until we turn this on. */
export const BILLING_CHECKOUT_ENABLED = false;

/**
 * Public subscription catalog: Free + one paid Business plan
 * (Premium and Business were combined into Business).
 */
export const PLAN_CATALOG: Record<
  PlanCode,
  { name: string; description: string; priceCents: number; features: PlanFeatures }
> = {
  free: {
    name: "Free",
    description: "Basic profile, products/services, and basic analytics",
    priceCents: 0,
    features: { ...DEFAULT_FREE_FEATURES },
  },
  business: {
    name: "Business",
    description:
      "Enhanced profile, media, offers, analytics, leads, team, and sponsored placement eligibility",
    priceCents: 49900,
    features: {
      ...DEFAULT_FREE_FEATURES,
      enhancedProfile: true,
      additionalMedia: true,
      offers: true,
      advancedAnalytics: true,
      leadManagement: true,
      teamMembers: true,
      maxTeamMembers: 20,
      maxPhotos: 120,
      maxProducts: 500,
      maxServices: 500,
      sponsoredEligible: true,
    },
  },
};

/** Plans shown on the subscription page / public catalog. */
export const SUBSCRIPTION_PLAN_CODES: PlanCode[] = ["free", "business"];

/** Legacy DB/env code kept for older subscriptions and Razorpay plan ids. */
export type LegacyPlanCode = "premium";

export function normalizePlanCode(value: string | null | undefined): PlanCode {
  if (value === "premium" || value === "business") return "business";
  return "free";
}

export function parsePlanFeatures(raw: unknown): PlanFeatures {
  const obj = (raw ?? {}) as Partial<PlanFeatures>;
  return {
    ...DEFAULT_FREE_FEATURES,
    ...obj,
    maxTeamMembers: Number(obj.maxTeamMembers ?? DEFAULT_FREE_FEATURES.maxTeamMembers),
    maxPhotos: Number(obj.maxPhotos ?? DEFAULT_FREE_FEATURES.maxPhotos),
    maxProducts: Number(obj.maxProducts ?? DEFAULT_FREE_FEATURES.maxProducts),
    maxServices: Number(obj.maxServices ?? DEFAULT_FREE_FEATURES.maxServices),
  };
}

export function isPlanCode(value: string): value is PlanCode | LegacyPlanCode {
  return value === "free" || value === "premium" || value === "business";
}

export function isPaidPlanCode(value: string): value is "business" | LegacyPlanCode {
  return value === "premium" || value === "business";
}
