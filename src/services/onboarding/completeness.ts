import type {
  CompletenessBreakdown,
  OnboardingDraftPayload,
} from "@/domain/onboarding/types";

/** Weighted completeness aligned with docs/ONBOARDING.md */
const WEIGHTS = {
  nameCategory: 15,
  location: 15,
  hours: 10,
  photos: 15,
  description: 10,
  contact: 10,
  catalog: 15,
  verified: 10,
} as const;

export type OnboardingDraft = OnboardingDraftPayload;

function hoursComplete(draft: OnboardingDraftPayload): boolean {
  if (draft.temporarilyClosed) return true;
  return draft.hours.some((h) => !h.isClosed && Boolean(h.opensAt && h.closesAt));
}

export function computeCompleteness(
  draft: OnboardingDraftPayload,
): CompletenessBreakdown {
  const groups: CompletenessBreakdown["groups"] = [];
  const missing: string[] = [];

  const nameOk = draft.name.trim().length > 1 && Boolean(draft.categorySlug.trim());
  groups.push({
    id: "nameCategory",
    label: "Name + category",
    weight: WEIGHTS.nameCategory,
    earned: nameOk ? WEIGHTS.nameCategory : 0,
    ok: nameOk,
  });
  if (!nameOk) missing.push("Add business name and category");

  const locationOk = Boolean(
    draft.addressLine1.trim() &&
    draft.city.trim() &&
    draft.suburb.trim() &&
    draft.lat != null &&
    draft.lng != null &&
    Number.isFinite(draft.lat) &&
    Number.isFinite(draft.lng),
  );
  groups.push({
    id: "location",
    label: "Location",
    weight: WEIGHTS.location,
    earned: locationOk ? WEIGHTS.location : 0,
    ok: locationOk,
  });
  if (!locationOk) missing.push("Complete address and map pin");

  const hoursOk = hoursComplete(draft);
  groups.push({
    id: "hours",
    label: "Hours",
    weight: WEIGHTS.hours,
    earned: hoursOk ? WEIGHTS.hours : 0,
    ok: hoursOk,
  });
  if (!hoursOk) missing.push("Set weekly opening hours");

  const photosOk = draft.photos.length >= 3;
  groups.push({
    id: "photos",
    label: "Photos (≥3)",
    weight: WEIGHTS.photos,
    earned: photosOk ? WEIGHTS.photos : 0,
    ok: photosOk,
  });
  if (!photosOk) missing.push("Upload at least 3 photos");

  const descriptionOk = draft.description.trim().length >= 40;
  groups.push({
    id: "description",
    label: "Description",
    weight: WEIGHTS.description,
    earned: descriptionOk ? WEIGHTS.description : 0,
    ok: descriptionOk,
  });
  if (!descriptionOk) missing.push("Write a fuller description");

  const contactOk = Boolean(draft.phone.trim() && draft.email.trim());
  groups.push({
    id: "contact",
    label: "Contact",
    weight: WEIGHTS.contact,
    earned: contactOk ? WEIGHTS.contact : 0,
    ok: contactOk,
  });
  if (!contactOk) missing.push("Add phone and email");

  const catalogCount =
    draft.catalogItems.length +
    draft.menuCategories.reduce((n, c) => n + c.items.length, 0);
  const catalogOk = catalogCount >= 1;
  groups.push({
    id: "catalog",
    label: "Products or services",
    weight: WEIGHTS.catalog,
    earned: catalogOk ? WEIGHTS.catalog : 0,
    ok: catalogOk,
  });
  if (!catalogOk) missing.push("Add at least one product, dish, or service");

  const verified =
    draft.verificationStatus === "VERIFIED" || draft.claimStatus === "VERIFIED";
  groups.push({
    id: "verified",
    label: "Verified claim",
    weight: WEIGHTS.verified,
    earned: verified ? WEIGHTS.verified : 0,
    ok: verified,
  });
  if (!verified) missing.push("Complete ownership verification");

  const score = Math.round(groups.reduce((sum, g) => sum + g.earned, 0));
  return { score, missing, groups };
}

/** Numeric score only (ranking / progress bars). */
export function completenessScore(draft: OnboardingDraftPayload): number {
  return computeCompleteness(draft).score;
}
