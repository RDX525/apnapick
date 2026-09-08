import { describe, expect, it } from "vitest";
import { getFeatureFlags } from "@/config/feature-flags";

describe("feature flags", () => {
  it("enables search, onboarding, admin, and maps by default", () => {
    const flags = getFeatureFlags("{}");
    expect(flags.businessOnboardingEnabled).toBe(true);
    expect(flags.adminConsoleEnabled).toBe(true);
    expect(flags.mapsEnabled).toBe(true);
    expect(flags.paidPlacementEnabled).toBe(false);
    expect(flags.searchEnabled).toBe(true);
  });

  it("allows JSON overrides", () => {
    const flags = getFeatureFlags(
      '{"analyticsEnabled":true,"businessOnboardingEnabled":false}',
    );
    expect(flags.analyticsEnabled).toBe(true);
    expect(flags.businessOnboardingEnabled).toBe(false);
    expect(flags.searchEnabled).toBe(true);
  });
});
