import {
  createEmptyDraft,
  type OnboardingDraftPayload,
  type OnboardingStepId,
  ONBOARDING_STEPS,
} from "@/domain/onboarding/types";
import { completenessScore } from "@/services/onboarding/completeness";

const STORAGE_KEY = "apnapick.onboarding.draft.v1";

export type PersistedOnboardingState = {
  draft: OnboardingDraftPayload;
  stepIndex: number;
  updatedAt: string;
};

export function stepIdAt(index: number): OnboardingStepId {
  return ONBOARDING_STEPS[Math.max(0, Math.min(index, ONBOARDING_STEPS.length - 1))]!.id;
}

export function loadLocalDraft(): PersistedOnboardingState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
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

export function saveLocalDraft(
  draft: OnboardingDraftPayload,
  stepIndex: number,
): PersistedOnboardingState {
  const state: PersistedOnboardingState = {
    draft,
    stepIndex,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  return state;
}

export function clearLocalDraft() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function progressLabel(draft: OnboardingDraftPayload): string {
  return `${completenessScore(draft)}% complete`;
}
