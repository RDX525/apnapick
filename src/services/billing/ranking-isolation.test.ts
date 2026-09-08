import { describe, expect, it } from "vitest";
import { RankingService } from "@/services/search/ranking-service";
import type { ParsedSearchQuery, SearchCandidate } from "@/domain/search/types";
import { DEFAULT_RANKING_WEIGHTS } from "@/domain/ranking/weights";

const parsed: ParsedSearchQuery = {
  raw: "cafe",
  normalized: "cafe",
  intent: "discovery",
  categorySlugs: ["cafes"],
  itemTerms: [],
  expandedTerms: [],
  serviceTerms: [],
  attributes: [],
  pricePreference: null,
  qualityPreference: null,
  location: { mode: "near_me" },
  openNow: false,
  freeTextTokens: ["cafe"],
};

describe("organic ranking vs monetization", () => {
  it("ranking weights exclude payment fields", () => {
    expect(Object.keys(DEFAULT_RANKING_WEIGHTS)).not.toContain("paid");
    expect(Object.keys(DEFAULT_RANKING_WEIGHTS)).not.toContain("subscription");
    expect(Object.keys(DEFAULT_RANKING_WEIGHTS)).not.toContain("plan");
  });

  it("score breakdown never includes billing keys", () => {
    const ranking = new RankingService();
    const candidate: SearchCandidate = {
      businessId: "1",
      name: "Cafe",
      slug: "cafe",
      avgRating: 4,
      reviewCount: 10,
      completeness: 80,
      isClaimed: true,
      distanceM: 500,
      ftsRank: 0.5,
      trgmSim: 0.2,
      itemMatchScore: 0.5,
      relevance: 0.5,
      matchedVia: "fts",
    };
    const [result] = ranking.rank([candidate], parsed);
    const keys = Object.keys(result!.scoreBreakdown);
    expect(keys.some((k) => /paid|sponsor|subscription|plan/i.test(k))).toBe(false);
  });
});
