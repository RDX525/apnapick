/**
 * Replaceable search engine contract.
 *
 * Postgres FTS + pg_trgm + PostGIS is the default implementation.
 * A future Typesense/Elastic/Algolia adapter implements this interface
 * without changing SearchService or the frontend.
 */
import type {
  LocationContext,
  ParsedSearchQuery,
  SearchCandidate,
  SearchFilters,
} from "@/domain/search/types";

export type SearchRetrieveOptions = {
  location?: LocationContext;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
};

export interface SearchEngine {
  readonly name: string;
  retrieve(
    parsed: ParsedSearchQuery,
    options?: SearchRetrieveOptions,
  ): Promise<SearchCandidate[]>;
}

/** Alias kept for existing imports — prefer SearchEngine for new code. */
export type SearchRepository = SearchEngine;
