import type {
  ParsedSearchQuery,
  SearchActionType,
  SearchFilters,
  SearchSort,
} from "@/domain/search/types";
import { createLogger } from "@/lib/logging/logger";
import { createHash } from "node:crypto";

const log = createLogger({ module: "search-analytics" });

export type SearchAnalyticsRecordInput = {
  query: ParsedSearchQuery;
  resultCount: number;
  latencyMs: number;
  /** Coarse area only — never precise GPS. */
  areaSlug?: string | null;
  filters?: SearchFilters;
  sort?: SearchSort;
  sessionId?: string | null;
  radiusM?: number | null;
};

export type SearchActionInput = {
  searchEventId?: string | null;
  businessId: string;
  action: SearchActionType;
  /** Coarse area slug only. */
  areaSlug?: string | null;
  sessionId?: string | null;
  queryNormalized?: string | null;
};

function queryHash(normalized: string): string {
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

async function trySupabase() {
  try {
    const { createServerSupabaseClient } = await import("@/lib/db/supabase-server");
    return await createServerSupabaseClient();
  } catch {
    return null;
  }
}

/**
 * Anonymous / appropriate search analytics.
 * Persists query, coarse area, filters, result counts, clicks, and actions.
 * Does not store precise personal lat/lng.
 */
export class SearchAnalyticsService {
  async record(
    event: SearchAnalyticsRecordInput,
  ): Promise<{ searchEventId: string | null }> {
    const coarse = {
      q: event.query.normalized,
      intent: event.query.intent,
      categories: event.query.categorySlugs,
      items: event.query.itemTerms,
      openNow: event.query.openNow,
      area: event.areaSlug ?? event.query.location.areaSlug ?? null,
      filters: event.filters ?? null,
      sort: event.sort ?? "recommended",
      results: event.resultCount,
      ms: event.latencyMs,
    };

    if (process.env.NODE_ENV === "development") {
      console.info("[search_analytics]", coarse);
    }

    try {
      const supabase = await trySupabase();
      if (!supabase) return { searchEventId: null };

      const hash = queryHash(event.query.normalized);

      // Single atomic RPC: upsert + counter increment + event insert.
      // Avoids a read-modify-write race on hit_count and needs no open
      // UPDATE policy on `searches`.
      const { data: eventId, error } = await supabase.rpc("record_search_event", {
        p_normalized_query: event.query.normalized,
        p_query_hash: hash,
        p_intent: event.query.intent,
        p_category_slugs: event.query.categorySlugs,
        p_item_terms: event.query.itemTerms,
        p_service_terms: event.query.serviceTerms,
        p_session_id: event.sessionId ?? null,
        p_raw_query: event.query.raw,
        p_parsed: {
          intent: event.query.intent,
          categorySlugs: event.query.categorySlugs,
          itemTerms: event.query.itemTerms,
          serviceTerms: event.query.serviceTerms,
          attributes: event.query.attributes,
          qualityPreference: event.query.qualityPreference,
          pricePreference: event.query.pricePreference,
          location: event.query.location,
          openNow: event.query.openNow,
          filters: event.filters ?? null,
          sort: event.sort ?? "recommended",
        },
        p_result_count: event.resultCount,
        p_coarse_area_slug: event.areaSlug ?? event.query.location.areaSlug ?? null,
        p_radius_m: event.radiusM ?? null,
        p_latency_ms: event.latencyMs,
      });

      if (error) {
        log.warn("search_event_insert_failed", { message: error.message });
        return { searchEventId: null };
      }

      return { searchEventId: (eventId as string | null) ?? null };
    } catch (err) {
      log.warn("search_analytics_unavailable", {
        message: err instanceof Error ? err.message : "unknown",
      });
      return { searchEventId: null };
    }
  }

  async recordAction(input: SearchActionInput): Promise<void> {
    if (process.env.NODE_ENV === "development") {
      console.info("[search_action]", {
        action: input.action,
        businessId: input.businessId,
        area: input.areaSlug ?? null,
        searchEventId: input.searchEventId ?? null,
      });
    }

    try {
      const supabase = await trySupabase();
      if (!supabase) return;

      await supabase.from("search_actions").insert({
        search_event_id: input.searchEventId ?? null,
        business_id: input.businessId,
        action: input.action,
        coarse_area_slug: input.areaSlug ?? null,
        session_id: input.sessionId ?? null,
        query_normalized: input.queryNormalized ?? null,
      });

      if (input.searchEventId && input.action === "click") {
        // Atomic append — concurrent clicks on one search event used to
        // overwrite each other via read-then-update.
        await supabase.rpc("append_search_event_selection", {
          p_event_id: input.searchEventId,
          p_business_id: input.businessId,
        });
      }
    } catch (err) {
      log.warn("search_action_failed", {
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }
}
