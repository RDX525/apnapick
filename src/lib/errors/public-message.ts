import { friendlyOnboardingSubmitError } from "@/services/onboarding/submit-payload";

function friendlyWorkspaceSaveError(raw: string): string | null {
  if (/photos_one_cover/i.test(raw)) {
    return "Only one cover photo is allowed. Set a single cover, then save again.";
  }
  if (/business_locations_one_primary/i.test(raw)) {
    return "This listing already has a map pin. Refresh the page and try again.";
  }
  if (/business_categories_one_primary/i.test(raw)) {
    return "Choose one category, then save again.";
  }
  if (/invalid input syntax for type time/i.test(raw)) {
    return "Check opening hours — one of the times isn’t valid.";
  }
  if (/invalid input syntax for type date/i.test(raw)) {
    return "Check special hours — one of the dates isn’t valid.";
  }
  return null;
}

/** Map provider/database text to a stable client message. Keep the raw text in logs. */
export function publicMutationMessage(raw: string | null | undefined, fallback: string) {
  const text = raw?.trim() ?? "";
  if (!text) return fallback;
  return (
    friendlyOnboardingSubmitError(text) ??
    friendlyWorkspaceSaveError(text) ??
    fallback
  );
}
