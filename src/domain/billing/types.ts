export type PlanCode = "free" | "premium" | "business";

export type SubscriptionStatus =
  "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";

export type InvoiceStatus = "draft" | "open" | "paid" | "void" | "uncollectible";

/** Entitlements encoded on plans.features — never inferred from client. */
export type PlanFeatures = {
  basicProfile: boolean;
  basicProducts: boolean;
  basicServices: boolean;
  basicAnalytics: boolean;
  enhancedProfile: boolean;
  additionalMedia: boolean;
  offers: boolean;
  advancedAnalytics: boolean;
  leadManagement: boolean;
  teamMembers: boolean;
  maxTeamMembers: number;
  maxPhotos: number;
  maxProducts: number;
  maxServices: number;
  /** Eligible for separate sponsored slots — never organic boost */
  sponsoredEligible: boolean;
};

export type Plan = {
  id: string;
  code: PlanCode;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  interval: "month" | "year";
  features: PlanFeatures;
  externalPriceId: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type Subscription = {
  id: string;
  businessId: string;
  planId: string;
  planCode: PlanCode;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  canceledAt: string | null;
  externalCustomerId: string | null;
  externalSubscriptionId: string | null;
};

export type SponsoredResult = {
  businessId: string;
  name: string;
  slug: string;
  suburb: string | null;
  avgRating: number;
  reviewCount: number;
  /** Always true for sponsored slots */
  sponsored: true;
  label: string;
  placementId: string;
};

export const DEFAULT_FREE_FEATURES: PlanFeatures = {
  basicProfile: true,
  basicProducts: true,
  basicServices: true,
  basicAnalytics: true,
  enhancedProfile: false,
  additionalMedia: false,
  offers: false,
  advancedAnalytics: false,
  leadManagement: false,
  teamMembers: false,
  maxTeamMembers: 1,
  maxPhotos: 5,
  maxProducts: 10,
  maxServices: 10,
  sponsoredEligible: false,
};

export type PlanFeatureKey = keyof PlanFeatures;
