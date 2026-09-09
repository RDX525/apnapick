import {
  createEmptyDraft,
  type OnboardingDraftPayload,
  type OnboardingStepId,
  ONBOARDING_STEPS,
} from "@/domain/onboarding/types";
import { completenessScore } from "@/services/onboarding/completeness";

/** Pre-account drafts lived on a shared key — never restore these. */
const LEGACY_STORAGE_KEY = "apnapick.onboarding.draft.v1";
const STORAGE_PREFIX = "apnapick.onboarding.draft.v2:";

export type PersistedOnboardingState = {
  draft: OnboardingDraftPayload;
  stepIndex: number;
  updatedAt: string;
};

export function stepIdAt(index: number): OnboardingStepId {
  return ONBOARDING_STEPS[Math.max(0, Math.min(index, ONBOARDING_STEPS.length - 1))]!.id;
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function parseDraft(raw: string | null): PersistedOnboardingState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedOnboardingState;
    if (!parsed?.draft) return null;
    return {
      draft: { ...createEmptyDraft(), ...parsed.draft },
      stepIndex: parsed.stepIndex ?? 0,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function clearLegacyAnonymousDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadLocalDraft(userId: string | null | undefined): PersistedOnboardingState | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    return parseDraft(window.localStorage.getItem(storageKey(userId)));
  } catch {
    return null;
  }
}

export function saveLocalDraft(
  userId: string | null | undefined,
  draft: OnboardingDraftPayload,
  stepIndex: number,
): PersistedOnboardingState {
  const state: PersistedOnboardingState = {
    draft,
    stepIndex,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined" && userId) {
    try {
      window.localStorage.setItem(storageKey(userId), JSON.stringify(state));
    } catch {
      /* ignore quota / private mode */
    }
  }
  return state;
}

export function clearLocalDraft(userId: string | null | undefined) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    if (userId) window.localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore quota / private mode */
  }
}

export function progressLabel(draft: OnboardingDraftPayload): string {
  return `${completenessScore(draft)}% complete`;
}
