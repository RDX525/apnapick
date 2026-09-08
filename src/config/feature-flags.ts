export const DEFAULT_FEATURE_FLAGS = {
  searchEnabled: true,
  businessOnboardingEnabled: true,
  adminConsoleEnabled: true,
  mapsEnabled: true,
  paidPlacementEnabled: false,
  analyticsEnabled: false,
} as const;

export type FeatureFlagKey = keyof typeof DEFAULT_FEATURE_FLAGS;
export type FeatureFlags = Record<FeatureFlagKey, boolean>;

function parseOverrides(raw: string | undefined): Partial<FeatureFlags> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<FeatureFlags> = {};
    for (const key of Object.keys(DEFAULT_FEATURE_FLAGS) as FeatureFlagKey[]) {
      if (typeof parsed[key] === "boolean") {
        out[key] = parsed[key];
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function getFeatureFlags(
  overridesJson = process.env.FEATURE_FLAGS_JSON,
): FeatureFlags {
  return {
    ...DEFAULT_FEATURE_FLAGS,
    ...parseOverrides(overridesJson),
  };
}

export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return getFeatureFlags()[flag];
}
