import "server-only";

import type { ParsedSearchQuery, SearchCandidate } from "@/domain/search/types";
import type { SearchEngine, SearchRetrieveOptions } from "@/domain/search/search-engine";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { createLogger } from "@/lib/logging/logger";

const log = createLogger({ module: "postgres-search-repository" });

type RpcRow = {
  business_id: string;
  name: string;
  slug: string;
  avg_rating: number;
  review_count: number;
  completeness: number;
  is_claimed: boolean;
  distance_m: number | null;
  fts_rank: number;
  trgm_sim: number;
  item_match_score: number;
  relevance: number;
  matched_via: string;
  matched_item_name?: string | null;
  price_level?: number | null;
  suburb?: string | null;
  city?: string | null;
  open_now?: boolean | null;
  popularity_score?: number | null;
  freshness_score?: number | null;
  has_offer?: boolean | null;
};

function priceLevelsFromParsed(parsed: ParsedSearchQuery): number[] | null {
  if (parsed.pricePreference === "cheap") return [1, 2];
  if (parsed.pricePreference === "moderate") return [2, 3];
  if (parsed.pricePreference === "premium") return [3, 4];
  return null;
}

/**
 * Postgres FTS + pg_trgm + PostGIS retrieval.
 * Implements SearchEngine so it can be swapped for an external search product.
 */
export class PostgresSearchRepository implements SearchEngine {
  readonly name = "postgres-fts-trgm-postgis";

  async retrieve(
    parsed: ParsedSearchQuery,
    options?: SearchRetrieveOptions,
  ): Promise<SearchCandidate[]> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return [];

    const location = options?.location;
    const filters = options?.filters;
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const q =
      [
        ...parsed.itemTerms,
        ...parsed.expandedTerms,
        ...parsed.serviceTerms,
        ...parsed.freeTextTokens,
      ]
        .join(" ")
        .trim() || parsed.normalized;

    const categorySlugs =
      filters?.categorySlugs && filters.categorySlugs.length > 0
        ? filters.categorySlugs
        : parsed.categorySlugs.length > 0
          ? parsed.categorySlugs
          : null;

    const attributes = [
      ...new Set([...(parsed.attributes ?? []), ...(filters?.attributes ?? [])]),
    ];

    const priceLevels =
      filters?.priceLevels && filters.priceLevels.length > 0
        ? filters.priceLevels
        : priceLevelsFromParsed(parsed);

    const openNow = filters?.openNow ?? (parsed.openNow ? true : null);

    const { data, error } = await supabase.rpc("search_business_candidates", {
      p_query: q,
      p_lat: location?.lat ?? null,
      p_lng: location?.lng ?? null,
      p_radius_m: filters?.distanceM ?? location?.radiusM ?? 8000,
      p_category_slugs: categorySlugs,
      p_attribute_keys: attributes.length > 0 ? attributes : null,
      p_min_rating: filters?.minRating ?? null,
      p_price_levels: priceLevels,
      p_open_now: openNow,
      p_require_offers: filters?.hasOffers ?? null,
      p_service_terms:
        filters?.services && filters.services.length > 0
          ? filters.services
          : parsed.serviceTerms.length > 0
            ? parsed.serviceTerms
            : null,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      log.error("search_rpc_failed", { message: error.message });
      return [];
    }

    return mapRows((data ?? []) as RpcRow[]);
  }
}

function mapRows(rows: RpcRow[]): SearchCandidate[] {
  return rows.map((row) => ({
    businessId: row.business_id,
    name: row.name,
    slug: row.slug,
    avgRating: Number(row.avg_rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    completeness: Number(row.completeness ?? 0),
    isClaimed: Boolean(row.is_claimed),
    distanceM: row.distance_m == null ? null : Number(row.distance_m),
    ftsRank: Number(row.fts_rank ?? 0),
    trgmSim: Number(row.trgm_sim ?? 0),
    itemMatchScore: Number(row.item_match_score ?? 0),
    relevance: Number(row.relevance ?? 0),
    matchedVia: row.matched_via,
    matchedItemName: row.matched_item_name ?? null,
    priceLevel: row.price_level == null ? null : Number(row.price_level),
    suburb: row.suburb ?? null,
    city: row.city ?? null,
    openNow: row.open_now ?? null,
    popularityScore:
      row.popularity_score == null ? undefined : Number(row.popularity_score),
    freshnessScore: row.freshness_score == null ? undefined : Number(row.freshness_score),
    hasOffer: row.has_offer ?? undefined,
  }));
}
