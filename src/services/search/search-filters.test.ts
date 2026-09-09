import { describe, expect, it } from "vitest";
import { pickMatchedCatalogItem } from "@/services/search/catalog-match";
import { applySearchFilters } from "@/services/search/search-filters";
import type { ParsedSearchQuery, SearchCandidate } from "@/domain/search/types";

const parsed = (partial: Partial<ParsedSearchQuery>): ParsedSearchQuery => ({
  raw: "chicken curry",
  normalized: "chicken curry",
  intent: "discovery",
  categorySlugs: ["restaurants"],
  itemTerms: ["chicken curry"],
  expandedTerms: ["chicken curry"],
  serviceTerms: [],
  attributes: [],
  pricePreference: null,
  maxPriceCents: null,
  qualityPreference: null,
  location: { mode: "near_me" },
  openNow: false,
  freeTextTokens: ["chicken", "curry"],
  ...partial,
});

function candidate(partial: Partial<SearchCandidate>): SearchCandidate {
  return {
    businessId: "1",
    name: "Test",
    slug: "test",
    avgRating: 4,
    reviewCount: 10,
    completeness: 80,
    isClaimed: false,
    distanceM: 1000,
    ftsRank: 0.5,
    trgmSim: 0.2,
    itemMatchScore: 0.5,
    relevance: 0.5,
    matchedVia: "product",
    ...partial,
  };
}

describe("pickMatchedCatalogItem", () => {
  it("prefers a matching item under the rupee cap", () => {
    const picked = pickMatchedCatalogItem(
      [
        { name: "Chicken curry", priceCents: 38000 },
        { name: "Chicken curry bowl", priceCents: 24900 },
        { name: "Naan", priceCents: 4000 },
      ],
      ["chicken curry"],
      30000,
    );
    expect(picked?.priceCents).toBe(24900);
  });
});

describe("applySearchFilters rupee cap", () => {
  it("drops priced matches above the cap and keeps unpriced rows", () => {
    const filtered = applySearchFilters(
      [
        candidate({
          businessId: "over",
          matchedItemPriceCents: 38000,
        }),
        candidate({
          businessId: "under",
          matchedItemPriceCents: 24900,
        }),
        candidate({
          businessId: "unknown",
          matchedItemPriceCents: null,
        }),
      ],
      parsed({ maxPriceCents: 30000 }),
    );
    expect(filtered.map((c) => c.businessId)).toEqual(["under", "unknown"]);
  });
});

describe("applySearchFilters named area", () => {
  it("keeps a Wagholi listing whose pin is outside the neighbourhood radius", () => {
    const filtered = applySearchFilters(
      [
        candidate({
          businessId: "aromic",
          suburb: "Wagholi",
          city: "Pune",
          distanceM: 15000,
        }),
        candidate({
          businessId: "other",
          suburb: "Baner",
          city: "Pune",
          distanceM: 15000,
        }),
      ],
      parsed({
        categorySlugs: ["beauty-personal-care"],
        itemTerms: [],
        location: { mode: "named", areaSlug: "wagholi", label: "Wagholi" },
      }),
      { distanceM: 8000 },
    );
    expect(filtered.map((c) => c.businessId)).toEqual(["aromic"]);
  });
});
