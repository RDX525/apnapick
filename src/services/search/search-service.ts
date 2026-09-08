import type {
  LocationContext,
  SearchRequest,
  SearchResponse,
} from "@/domain/search/types";
import type { SearchEngine } from "@/domain/search/search-engine";
import { geoSearchService } from "@/services/search/geo-search-service";
import { rankingService } from "@/services/search/ranking-service";
import { searchParser } from "@/services/search/search-parser";
import { applySearchFilters, applySearchSort } from "@/services/search/search-filters";
import { SearchAnalyticsService } from "@/services/search/search-analytics-service";

/**
 * Stable orchestrator for local search.
 * Frontend depends only on this service's request/response contract —
 * swap SearchEngine implementations without UI changes.
 *
 * Organic ranking never receives billing/subscription signals.
 * Sponsored slots are attached outside RankingService (see get-search-service).
 */
export class SearchService {
  constructor(
    private readonly engine: SearchEngine,
    private readonly analytics = new SearchAnalyticsService(),
    private readonly ranking = rankingService,
  ) {}

  async search(request: SearchRequest): Promise<SearchResponse> {
    const started = Date.now();
    const parsed = searchParser.parse(request.query);
    const intent = searchParser.summarize(parsed);

    const radiusM = geoSearchService.effectiveRadiusM(
      request.location,
      request.filters?.distanceM,
    );

    const location: LocationContext = {
      ...request.location,
      radiusM,
    };

    if (parsed.location.mode === "named" && parsed.location.areaSlug) {
      location.areaSlug = parsed.location.areaSlug;
      location.label = parsed.location.label;
    } else if (request.location?.areaSlug) {
      const named = geoSearchService.resolveNamedArea(request.location.areaSlug);
      location.areaSlug = named?.slug ?? request.location.areaSlug;
      location.label = named?.label ?? request.location.label;
    }

    const candidates = await this.engine.retrieve(parsed, {
      location,
      filters: request.filters,
      limit: 80,
    });

    const filtered = applySearchFilters(candidates, parsed, request.filters);
    let ranked = this.ranking.rank(filtered, parsed, { radiusM });
    ranked = applySearchSort(ranked, request.sort);

    const page = Math.max(1, request.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, request.pageSize ?? 20));
    const start = (page - 1) * pageSize;
    const pageResults = ranked.slice(start, start + pageSize);

    const latencyMs = Date.now() - started;
    const coarse = geoSearchService.coarsenForAnalytics(location);

    const { searchEventId } = await this.analytics.record({
      query: parsed,
      resultCount: ranked.length,
      latencyMs,
      areaSlug: coarse.areaSlug,
      filters: request.filters,
      sort: request.sort ?? "recommended",
      sessionId: request.sessionId,
      radiusM: coarse.radiusM,
    });

    return {
      query: parsed,
      intent,
      results: pageResults,
      sponsored: [],
      total: ranked.length,
      page,
      pageSize,
      latencyMs,
      searchEventId,
    };
  }
}
