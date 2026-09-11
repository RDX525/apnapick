import { friendlyOnboardingSubmitError } from "@/services/onboarding/submit-payload";

/** Map provider/database text to a stable client message. Keep the raw text in logs. */
export function publicMutationMessage(raw: string | null | undefined, fallback: string) {
  const text = raw?.trim() ?? "";
  if (!text) return fallback;
  return friendlyOnboardingSubmitError(text) ?? fallback;
}
