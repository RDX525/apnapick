import { friendlyOnboardingSubmitError } from "@/services/onboarding/submit-payload";

export function providerErrorText(error: {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
} | null | undefined): string {
  return [error?.message, error?.details, error?.hint, error?.code]
    .map((part) => part?.trim() ?? "")
    .filter((part) => part.length > 0)
    .join(" ");
}

function friendlyWorkspaceSaveError(raw: string): string | null {
  if (/unpublishing requires admin/i.test(raw)) {
    return "Live listings stay published. Apply the latest database migration, then save again so this edit can go to admin review.";
  }
  if (/photos_one_cover/i.test(raw)) {
    return "Only one cover photo is allowed. Set a single cover, then save again.";
  }
  if (/business_locations_one_primary/i.test(raw)) {
    return "This listing already has a map pin. Refresh the page and try again.";
  }
  if (/business_categories_one_primary/i.test(raw)) {
    return "Choose one category, then save again.";
  }
  if (/business_hours_unique_day|business_hours_open_pair/i.test(raw)) {
    return "Set opening and closing times for each open day, or mark the day closed.";
  }
  if (/invalid input syntax for type time/i.test(raw)) {
    return "Check opening hours — one of the times isn’t valid.";
  }
  if (/invalid input syntax for type date/i.test(raw)) {
    return "Check special hours — one of the dates isn’t valid.";
  }
  if (/invalid input syntax for type integer/i.test(raw)) {
    return "Check product or menu prices, then save again.";
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
