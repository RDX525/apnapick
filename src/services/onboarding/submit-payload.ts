import type { DayHours, OnboardingDraftPayload } from "@/domain/onboarding/types";
import { DEFAULT_CATEGORIES } from "@/config/consumer-content";

/** Owner-facing slugs that may not exist yet in older databases. */
export const ONBOARDING_CATEGORY_FALLBACKS: Record<string, string[]> = {
  "food-dining": ["restaurants", "cafes"],
  "home-repair": ["plumbers"],
  "beauty-personal-care": ["beauty-personal-care", "barbers"],
  "health-wellness": ["beauty-personal-care"],
};

function slugifyCategory(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveOnboardingCategorySlug(
  requested: string,
  existing: Iterable<string>,
): string | null {
  const slugs = new Set(
    [...existing].map((slug) => slug.trim()).filter((slug) => slug.length > 0),
  );
  const trimmed = requested.trim();
  if (!trimmed) return null;
  if (slugs.has(trimmed)) return trimmed;
  const slugified = slugifyCategory(trimmed);
  if (slugs.has(slugified)) return slugified;
  for (const category of DEFAULT_CATEGORIES) {
    if (
      category.name.toLowerCase() === trimmed.toLowerCase() ||
      slugifyCategory(category.name) === slugified
    ) {
      for (const fallback of [
        category.slug,
        ...(ONBOARDING_CATEGORY_FALLBACKS[category.slug] ?? []),
      ]) {
        if (slugs.has(fallback)) return fallback;
      }
    }
  }
  for (const fallback of [
    ...(ONBOARDING_CATEGORY_FALLBACKS[trimmed] ?? []),
    ...(ONBOARDING_CATEGORY_FALLBACKS[slugified] ?? []),
  ]) {
    if (slugs.has(fallback)) return fallback;
  }
  return null;
}

export function ownerCategoryRows() {
  return DEFAULT_CATEGORIES.map((category, index) => ({
    slug: category.slug,
    name: category.name,
    description: category.description,
    sort_order: index + 1,
    is_active: true,
  }));
}

function sanitizeHours(hours: DayHours[]): DayHours[] {
  return hours.map((day) => {
    const opensAt = day.opensAt?.trim() || null;
    const closesAt = day.closesAt?.trim() || null;
    if (day.isClosed || !opensAt || !closesAt) {
      return { ...day, isClosed: true, opensAt: null, closesAt: null };
    }
    return { ...day, opensAt, closesAt, isClosed: false };
  });
}

/** Shape the onboarding draft so listing submission can persist. */
export function prepareOnboardingSubmitPayload(
  draft: OnboardingDraftPayload,
  categorySlug: string,
): OnboardingDraftPayload {
  return {
    ...draft,
    name: draft.name.trim(),
    categorySlug,
    catalogItems: draft.catalogItems.filter((item) => item.name.trim().length > 0),
    menuCategories: draft.menuCategories
      .map((category) => ({
        ...category,
        name: category.name.trim(),
        items: category.items.filter((item) => item.name.trim().length > 0),
      }))
      .filter((category) => category.name.length > 0),
    hours: sanitizeHours(draft.hours),
    specialHours: draft.specialHours.filter((entry) => Boolean(entry.date)),
    photos: draft.photos.map((photo) => {
      const storagePath = photo.storagePath?.trim() ?? "";
      const usable =
        storagePath.length > 0 &&
        !storagePath.startsWith("blob:") &&
        !storagePath.startsWith("data:") &&
        !storagePath.startsWith("local/");
      return {
        ...photo,
        storagePath: usable ? storagePath : null,
        previewUrl:
          photo.previewUrl?.startsWith("blob:") ||
          photo.previewUrl?.startsWith("data:")
            ? null
            : photo.previewUrl,
      };
    }),
  };
}

export function friendlyOnboardingSubmitError(raw: string): string | null {
  const message = raw.trim();
  if (!message) return null;
  if (/select a valid active category/i.test(message)) {
    return "Choose a valid category, then submit again.";
  }
  if (/businesses_normalized_name_area/i.test(message)) {
    return "A listing with this name already exists in that area. Claim it on step 1 (Find business): search your name and tap Claim this business.";
  }
  if (/business_hours_open_pair/i.test(message)) {
    return "Set opening and closing times for each open day, or mark the day closed.";
  }
  if (/products_name_not_blank|services_name_not_blank|menu_items_name_not_blank/i.test(
    message,
  )) {
    return "Remove empty product, service, or menu rows, then submit again.";
  }
  if (/authentication required/i.test(message)) {
    return "Your session expired. Log in and submit again.";
  }
  if (/business name required/i.test(message)) {
    return "Business name is required.";
  }
  if (/this business is not available to claim/i.test(message)) {
    return "That listing can’t be claimed. Create a new listing or pick a different match.";
  }
  if (/already have access to this business/i.test(message)) {
    return "You already have access to this listing. Open the dashboard instead of claiming it again.";
  }
  if (/could not find the function|schema cache|pgrst202/i.test(message)) {
    return "Claim submission isn’t available on this database yet. Try again in a moment, or create a new listing.";
  }
  if (/business_claims_claimant_id_fkey|profiles_pkey/i.test(message)) {
    return "Your account profile isn’t ready yet. Log out, log back in, and submit again.";
  }
  if (/business_claims_business_id_fkey/i.test(message)) {
    return "That listing isn’t in the directory anymore. Search again on Find business and claim the current match.";
  }
  if (/row-level security|permission denied|42501/i.test(message)) {
    return "Your session doesn’t have permission to submit this claim. Log in again and retry.";
  }
  return null;
}

export function isMissingRpcError(message: string) {
  return /could not find the function|schema cache|pgrst202/i.test(message);
}
