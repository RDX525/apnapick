/**
 * Organic ranking weights. Paid / subscription status must NEVER appear here.
 * Sponsored placements are a separate list (`SearchResponse.sponsored`) and must be labeled.
 *
 * Override via SEARCH_RANKING_WEIGHTS JSON env (partial object merged onto defaults).
 */
export type RankingWeights = {
  queryRelevance: number;
  itemMatch: number;
  distance: number;
  rating: number;
  reviewVolume: number;
  completeness: number;
  popularity: number;
  freshness: number;
  availability: number;
  trust: number;
};

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  queryRelevance: 0.3,
  itemMatch: 0.18,
  distance: 0.16,
  rating: 0.12,
  reviewVolume: 0.08,
  completeness: 0.06,
  popularity: 0.05,
  freshness: 0.03,
  availability: 0.02,
  trust: 0.05,
};

export function mergeRankingWeights(
  overrides?: Partial<RankingWeights> | null,
): RankingWeights {
  if (!overrides) return { ...DEFAULT_RANKING_WEIGHTS };
  return { ...DEFAULT_RANKING_WEIGHTS, ...overrides };
}

/** Parse optional SEARCH_RANKING_WEIGHTS JSON from the environment. */
export function rankingWeightsFromEnv(
  raw: string | undefined = process.env.SEARCH_RANKING_WEIGHTS,
): RankingWeights {
  if (!raw?.trim()) return { ...DEFAULT_RANKING_WEIGHTS };
  try {
    const parsed = JSON.parse(raw) as Partial<RankingWeights>;
    return mergeRankingWeights(parsed);
  } catch {
    return { ...DEFAULT_RANKING_WEIGHTS };
  }
}
