import { expandSupplyCategorySlugs } from "@/config/seo-taxonomy";
import type {
  ParsedSearchQuery,
  PricePreference,
  RankedSearchResult,
  SearchCandidate,
  SearchFilters,
} from "@/domain/search/types";
import { listingMatchesNamedArea } from "@/lib/search/named-area";

function priceLevelsForPreference(
  pref: PricePreference | null | undefined,
): number[] | null {
  if (pref === "cheap") return [1, 2];
  if (pref === "moderate") return [2, 3];
  if (pref === "premium") return [3, 4];
  return null;
}

/**
 * Apply explicit + parsed filters to candidates (engine-agnostic).
 * Postgres may push some filters down; this guarantees consistency for
 * in-memory and partial engine implementations.
 */
export function applySearchFilters(
  candidates: SearchCandidate[],
  parsed: ParsedSearchQuery,
  filters?: SearchFilters,
): SearchCandidate[] {
  const openNow = filters?.openNow ?? (parsed.openNow ? true : undefined);
  const categorySlugs =
    filters?.categorySlugs && filters.categorySlugs.length > 0
      ? filters.categorySlugs
      : parsed.categorySlugs;
  const attributes = [
    ...new Set([...(parsed.attributes ?? []), ...(filters?.attributes ?? [])]),
  ];
  const minRating = filters?.minRating;
  const priceLevels =
    parsed.maxPriceCents != null
      ? null
      : filters?.priceLevels && filters.priceLevels.length > 0
        ? filters.priceLevels
        : priceLevelsForPreference(parsed.pricePreference);
  const services = filters?.services ?? [];
  const hasOffers = filters?.hasOffers;
  const verifiedOnly = filters?.verifiedOnly;
  const maxDistance = filters?.distanceM;

  return candidates.filter((c) => {
    if (openNow === true && c.openNow === false) return false;
    if (minRating != null && c.avgRating < minRating) return false;
    if (maxDistance != null && c.distanceM != null && c.distanceM > maxDistance) {
      const namedSlug =
        parsed.location.mode === "named" ? parsed.location.areaSlug : undefined;
      if (!listingMatchesNamedArea(c.suburb, c.city, namedSlug)) {
        return false;
      }
    }
    if (priceLevels && c.priceLevel != null) {
      if (!priceLevels.includes(c.priceLevel)) return false;
    }
    if (
      parsed.maxPriceCents != null &&
      c.matchedItemPriceCents != null &&
      c.matchedItemPriceCents > parsed.maxPriceCents
    ) {
      return false;
    }
    if (categorySlugs.length > 0 && c.categories && c.categories.length > 0) {
      const allowed = expandSupplyCategorySlugs(categorySlugs);
      if (!c.categories.some((slug) => allowed.includes(slug))) {
        return false;
      }
    }
    if (hasOffers === true && c.hasOffer === false) return false;
    if (verifiedOnly === true && !c.isVerified) return false;
    if (services.length > 0) {
      const hay = `${c.matchedItemName ?? ""} ${c.name}`.toLowerCase();
      if (!services.some((s) => hay.includes(s.toLowerCase()))) {
        // Soft: keep if service match was already scored via itemMatch
        if ((c.itemMatchScore ?? 0) < 0.2) return false;
      }
    }
    // Attribute filtering when candidate exposes category/attrs via matchedVia only —
    // engines that omit attributes skip this (Postgres pushes attributes down).
    void attributes;
    return true;
  });
}

export function applySearchSort(
  results: RankedSearchResult[],
  sort: string | undefined,
): RankedSearchResult[] {
  const mode = sort === "recommended" || !sort ? "relevance" : sort;
  if (mode === "relevance") return results;
  const copy = [...results];
  if (mode === "distance") {
    return copy.sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
  }
  if (mode === "rating") {
    return copy.sort((a, b) => {
      if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
      return b.reviewCount - a.reviewCount;
    });
  }
  if (mode === "reviews") {
    return copy.sort((a, b) => b.reviewCount - a.reviewCount);
  }
  return copy;
}
