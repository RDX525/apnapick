import type { PlanFeatures, PlanCode } from "@/domain/billing/types";
import { DEFAULT_FREE_FEATURES } from "@/domain/billing/types";

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
  premium: {
    name: "Premium",
    description: "Enhanced profile, media, offers, advanced analytics, leads, and team",
    priceCents: 199900,
    features: {
      ...DEFAULT_FREE_FEATURES,
      enhancedProfile: true,
      additionalMedia: true,
      offers: true,
      advancedAnalytics: true,
      leadManagement: true,
      teamMembers: true,
      maxTeamMembers: 5,
      maxPhotos: 40,
      maxProducts: 100,
      maxServices: 100,
    },
  },
  business: {
    name: "Business",
    description:
      "Everything in Premium plus eligibility for clearly labeled sponsored placement",
    priceCents: 499900,
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

export function isPlanCode(value: string): value is PlanCode {
  return value === "free" || value === "premium" || value === "business";
}
