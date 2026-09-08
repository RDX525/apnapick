import "server-only";

import { unstable_cache } from "next/cache";
import type { ParsedSearchQuery, SearchCandidate } from "@/domain/search/types";
import type { SearchEngine, SearchRetrieveOptions } from "@/domain/search/search-engine";
import { SEARCH_DATA_REVALIDATE_SECONDS } from "@/lib/cache/public-data";
import { createPublicSupabaseClient } from "@/lib/db/supabase-public";
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

function roundCoord(value: number | undefined) {
  return value == null ? null : Number(value.toFixed(3));
}

function searchCacheKey(parsed: ParsedSearchQuery, options?: SearchRetrieveOptions) {
  const location = options?.location;
  const filters = options?.filters;
  return JSON.stringify({
    q: parsed.normalized,
    items: parsed.itemTerms,
    expanded: parsed.expandedTerms,
    services: parsed.serviceTerms,
    free: parsed.freeTextTokens,
    cats: parsed.categorySlugs,
    attrs: parsed.attributes,
    price: parsed.pricePreference,
    open: parsed.openNow,
    lat: roundCoord(location?.lat),
    lng: roundCoord(location?.lng),
    radius: filters?.distanceM ?? location?.radiusM ?? 8000,
    filterCats: filters?.categorySlugs ?? null,
    filterAttrs: filters?.attributes ?? null,
    minRating: filters?.minRating ?? null,
    priceLevels: filters?.priceLevels ?? null,
    filterOpen: filters?.openNow ?? null,
    offers: filters?.hasOffers ?? null,
    filterServices: filters?.services ?? null,
    limit: options?.limit ?? 50,
    offset: options?.offset ?? 0,
  });
}

async function retrieveUncached(cacheKey: string): Promise<SearchCandidate[]> {
  const parsedKey = JSON.parse(cacheKey) as ReturnType<typeof JSON.parse>;
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const q =
    [...parsedKey.items, ...parsedKey.expanded, ...parsedKey.services, ...parsedKey.free]
      .join(" ")
      .trim() || parsedKey.q;

  const categorySlugs =
    parsedKey.filterCats && parsedKey.filterCats.length > 0
      ? parsedKey.filterCats
      : parsedKey.cats.length > 0
        ? parsedKey.cats
        : null;

  const attributes = [
    ...new Set([...(parsedKey.attrs ?? []), ...(parsedKey.filterAttrs ?? [])]),
  ];

  const priceLevels =
    parsedKey.priceLevels && parsedKey.priceLevels.length > 0
      ? parsedKey.priceLevels
      : parsedKey.price === "cheap"
        ? [1, 2]
        : parsedKey.price === "moderate"
          ? [2, 3]
          : parsedKey.price === "premium"
            ? [3, 4]
            : null;

  const openNow = parsedKey.filterOpen ?? (parsedKey.open ? true : null);

  const { data, error } = await supabase.rpc("search_business_candidates", {
    p_query: q,
    p_lat: parsedKey.lat,
    p_lng: parsedKey.lng,
    p_radius_m: parsedKey.radius,
    p_category_slugs: categorySlugs,
    p_attribute_keys: attributes.length > 0 ? attributes : null,
    p_min_rating: parsedKey.minRating,
    p_price_levels: priceLevels,
    p_open_now: openNow,
    p_require_offers: parsedKey.offers,
    p_service_terms:
      parsedKey.filterServices && parsedKey.filterServices.length > 0
        ? parsedKey.filterServices
        : parsedKey.services.length > 0
          ? parsedKey.services
          : null,
    p_limit: parsedKey.limit,
    p_offset: parsedKey.offset,
  });

  if (error) {
    log.error("search_rpc_failed", { message: error.message });
    return [];
  }

  return mapRows((data ?? []) as RpcRow[]);
}

const loadCachedSearchCandidates = unstable_cache(
  retrieveUncached,
  ["search-candidates"],
  { revalidate: SEARCH_DATA_REVALIDATE_SECONDS, tags: ["search-candidates"] },
);

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
    return loadCachedSearchCandidates(searchCacheKey(parsed, options));
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
