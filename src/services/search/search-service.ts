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
import { NAMED_AREA_RETRIEVE_RADIUS_M } from "@/lib/search/named-area";
import { searchRetrieveLimit } from "@/lib/search/retrieve-window";
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

    const radiusM = geoSearchService.effectiveRadiusM(
      request.location,
      request.filters?.distanceM,
    );

    const location: LocationContext = {
      ...request.location,
      radiusM,
    };

    if (parsed.location.mode === "named" && parsed.location.areaSlug) {
      Object.assign(
        location,
        geoSearchService.withNamedAreaOrigin(location, parsed.location.areaSlug),
      );
    } else if (
      parsed.location.mode !== "near_me" &&
      request.location?.areaSlug &&
      request.location.areaSlug !== "pune"
    ) {
      Object.assign(
        location,
        geoSearchService.withNamedAreaOrigin(location, request.location.areaSlug),
      );
      if (location.areaSlug && location.areaSlug !== "pune") {
        parsed.location = {
          mode: "named",
          areaSlug: location.areaSlug,
          label: location.label,
        };
      }
    }

    const intent = searchParser.summarize(parsed);

    const retrieveFilters = { ...request.filters };
    if (parsed.location.mode === "named" && parsed.location.areaSlug !== "pune") {
      location.radiusM = Math.max(radiusM, NAMED_AREA_RETRIEVE_RADIUS_M);
      delete retrieveFilters.distanceM;
    }

    const page = Math.max(1, request.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, request.pageSize ?? 20));

    const candidates = await this.engine.retrieve(parsed, {
      location,
      filters: retrieveFilters,
      limit: searchRetrieveLimit(page, pageSize),
      offset: 0,
    });

    const filtered = applySearchFilters(candidates, parsed, request.filters);
    let ranked = this.ranking.rank(filtered, parsed, { radiusM });
    ranked = applySearchSort(ranked, request.sort);
    const start = (page - 1) * pageSize;
    const pageResults = ranked.slice(start, start + pageSize);

    const latencyMs = Date.now() - started;
    const coarse = geoSearchService.coarsenForAnalytics(location);

    void this.analytics.record({
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
      searchEventId: null,
    };
  }
}
