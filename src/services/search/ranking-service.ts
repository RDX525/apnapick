import { rankingWeightsFromEnv, type RankingWeights } from "@/domain/ranking/weights";
import type {
  ParsedSearchQuery,
  RankedSearchResult,
  SearchCandidate,
} from "@/domain/search/types";

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function bayesianRating(avg: number, count: number, prior = 3.7, priorWeight = 8) {
  return (prior * priorWeight + avg * count) / (priorWeight + count);
}

function distanceScore(distanceM: number | null, radiusM: number): number {
  if (distanceM == null) return 0.45;
  if (radiusM <= 0) return 0.5;
  return clamp01(1 - distanceM / radiusM);
}

function reviewVolumeScore(count: number): number {
  return clamp01(Math.log10(count + 1) / 3);
}

/**
 * Multi-signal organic ranking. Never sorts by rating alone.
 * Paid plan status is intentionally absent from the score.
 */
export class RankingService {
  constructor(private readonly weights: RankingWeights = rankingWeightsFromEnv()) {}

  withWeights(weights: Partial<RankingWeights>): RankingService {
    return new RankingService({ ...this.weights, ...weights });
  }

  getWeights(): RankingWeights {
    return { ...this.weights };
  }

  rank(
    candidates: SearchCandidate[],
    parsed: ParsedSearchQuery,
    options?: { radiusM?: number },
  ): RankedSearchResult[] {
    const radiusM = options?.radiusM ?? 5000;
    const w = this.weights;

    const ranked = candidates.map((c) => {
      const queryRelevance = clamp01(Math.max(c.relevance, c.ftsRank, c.trgmSim));
      const itemMatch = clamp01(c.itemMatchScore);
      const distance = distanceScore(c.distanceM, radiusM);
      const rating = clamp01(bayesianRating(c.avgRating, c.reviewCount) / 5);
      const reviewVolume = reviewVolumeScore(c.reviewCount);
      const completeness = clamp01(c.completeness / 100);
      const popularity = clamp01(c.popularityScore ?? 0);
      const freshness = clamp01(c.freshnessScore ?? 0.5);
      const availability =
        parsed.openNow && c.openNow === true
          ? 1
          : parsed.openNow && c.openNow === false
            ? 0
            : 0.5;
      const trust = c.isClaimed ? 1 : 0.35;

      // Quality preference gently boosts rating/trust without ignoring relevance
      const qualityBoost = parsed.qualityPreference === "best" ? 1.08 : 1;
      const budgetBoost =
        parsed.maxPriceCents != null &&
        c.matchedItemPriceCents != null &&
        c.matchedItemPriceCents <= parsed.maxPriceCents
          ? 1.06
          : 1;

      const scoreBreakdown = {
        queryRelevance,
        itemMatch,
        distance,
        rating,
        reviewVolume,
        completeness,
        popularity,
        freshness,
        availability,
        trust,
      };

      const score =
        (w.queryRelevance * queryRelevance +
          w.itemMatch * itemMatch +
          w.distance * distance +
          w.rating * rating +
          w.reviewVolume * reviewVolume +
          w.completeness * completeness +
          w.popularity * popularity +
          w.freshness * freshness +
          w.availability * availability +
          w.trust * trust) *
        qualityBoost *
        budgetBoost;

      return {
        ...c,
        score,
        scoreBreakdown,
      };
    });

    return ranked.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.itemMatchScore !== a.itemMatchScore) {
        return b.itemMatchScore - a.itemMatchScore;
      }
      if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
      return a.name.localeCompare(b.name);
    });
  }
}

export const rankingService = new RankingService();
