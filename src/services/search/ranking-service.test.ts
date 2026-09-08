import { describe, expect, it } from "vitest";
import { RankingService } from "@/services/search/ranking-service";
import type { ParsedSearchQuery, SearchCandidate } from "@/domain/search/types";

const baseParsed: ParsedSearchQuery = {
  raw: "best chicken curry",
  normalized: "best chicken curry",
  intent: "discovery",
  categorySlugs: ["restaurants"],
  itemTerms: ["chicken curry"],
  expandedTerms: ["chicken curry", "murgh curry", "chicken gravy"],
  serviceTerms: [],
  attributes: [],
  pricePreference: null,
  qualityPreference: "best",
  location: { mode: "near_me" },
  openNow: false,
  freeTextTokens: ["chicken", "curry"],
};

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
    matchedVia: "fts",
    ...partial,
  };
}

describe("RankingService", () => {
  it("ranks item match and distance above bare rating", () => {
    const ranking = new RankingService();
    const results = ranking.rank(
      [
        candidate({
          businessId: "far-high-rating",
          name: "Far Star",
          avgRating: 5,
          reviewCount: 2,
          itemMatchScore: 0.1,
          distanceM: 9000,
          relevance: 0.2,
        }),
        candidate({
          businessId: "near-item",
          name: "Near Curry",
          avgRating: 4.4,
          reviewCount: 80,
          itemMatchScore: 1,
          distanceM: 400,
          relevance: 0.7,
          isClaimed: true,
        }),
      ],
      baseParsed,
      { radiusM: 10000 },
    );

    expect(results[0]?.businessId).toBe("near-item");
  });

  it("does not use payment fields in scoring", () => {
    const ranking = new RankingService();
    const keys = Object.keys(
      ranking.rank([candidate({})], baseParsed)[0]!.scoreBreakdown,
    );
    expect(keys).not.toContain("paid");
    expect(keys).not.toContain("subscription");
  });
});
