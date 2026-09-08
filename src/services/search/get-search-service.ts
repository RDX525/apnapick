import "server-only";

import { hasSupabaseConfig } from "@/config/env";
import { EmptySearchRepository } from "@/repositories/search/search-repository";
import { PostgresSearchRepository } from "@/repositories/search/postgres-search-repository";
import { SearchService } from "@/services/search/search-service";
import { SearchAnalyticsService } from "@/services/search/search-analytics-service";
import { searchParser } from "@/services/search/search-parser";
import { listSponsoredResults } from "@/services/billing/sponsored-service";
import type { SearchEngine } from "@/domain/search/search-engine";
import type { SearchRequest, SearchResponse } from "@/domain/search/types";

let singleton: SearchService | null = null;
let analyticsSingleton: SearchAnalyticsService | null = null;

/**
 * Choose the active SearchEngine.
 * Default: Postgres FTS + pg_trgm + PostGIS when Supabase is configured.
 * Otherwise empty (never invent production listings).
 *
 * To plug an external engine later:
 *   return new SearchService(new TypesenseSearchEngine(...))
 */
export function createSearchEngine(): SearchEngine {
  if (hasSupabaseConfig()) {
    return new PostgresSearchRepository();
  }
  return new EmptySearchRepository();
}

export function getSearchService(): SearchService {
  if (singleton) return singleton;
  singleton = new SearchService(createSearchEngine());
  return singleton;
}

/**
 * Organic search + separate sponsored list (never mixed into ranking scores).
 */
export async function searchWithPlacements(
  request: SearchRequest,
): Promise<SearchResponse> {
  const sponsoredPromise = listSponsoredResults({
    query: searchParser.parse(request.query),
    areaSlug: request.location?.areaSlug,
    limit: 3,
  });
  const [organic, sponsored] = await Promise.all([
    getSearchService().search(request),
    sponsoredPromise,
  ]);
  return { ...organic, sponsored };
}

export function getSearchAnalyticsService(): SearchAnalyticsService {
  if (analyticsSingleton) return analyticsSingleton;
  analyticsSingleton = new SearchAnalyticsService();
  return analyticsSingleton;
}
