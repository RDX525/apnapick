import type { PlanFeatureKey, PlanFeatures } from "@/domain/billing/types";

export function hasEntitlement(features: PlanFeatures, key: PlanFeatureKey): boolean {
  const value = features[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}
