import { PUNE_DEMO_BUSINESSES } from "@/repositories/search/demo-catalog";
import type { ExistingBusinessForDup } from "@/services/onboarding/duplicate-detection";

export type ClaimableBusiness = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  website: string | null;
  addressLine1: string | null;
  suburb: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  categoryLabel: string | null;
  isClaimed: boolean;
};

/** Offline/demo claim directory — production uses published businesses via API. */
export function getDemoClaimableBusinesses(): ClaimableBusiness[] {
  return PUNE_DEMO_BUSINESSES.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    phone: null,
    website: null,
    addressLine1: null,
    suburb: b.suburb,
    city: b.city,
    lat: b.lat,
    lng: b.lng,
    categoryLabel: b.categories[0] ?? null,
    isClaimed: b.isClaimed,
  }));
}

export function searchClaimableBusinesses(
  query: string,
  catalog: ClaimableBusiness[] = getDemoClaimableBusinesses(),
): ClaimableBusiness[] {
  const q = query.trim().toLowerCase();
  if (!q) return catalog.slice(0, 8);
  return catalog
    .filter((b) => {
      const hay = [b.name, b.phone, b.addressLine1, b.suburb, b.city, b.slug]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q) || q.split(/\s+/).every((t) => hay.includes(t));
    })
    .slice(0, 12);
}

export function toDupCatalog(catalog: ClaimableBusiness[]): ExistingBusinessForDup[] {
  return catalog.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    phone: b.phone,
    website: b.website,
    addressLine1: b.addressLine1,
    suburb: b.suburb,
    city: b.city,
    lat: b.lat,
    lng: b.lng,
  }));
}
