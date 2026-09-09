import type { SponsoredResult } from "@/domain/billing/types";

export type SearchIntent = "discovery" | "business_name" | "service" | "unknown";

export type PricePreference = "cheap" | "moderate" | "premium";

export type ParsedLocation = {
  mode: "near_me" | "named" | "none";
  areaSlug?: string;
  label?: string;
};

/**
 * Full parsed query used across the search pipeline.
 * See `SearchIntentSummary` for the compact product-facing shape.
 */
export type ParsedSearchQuery = {
  raw: string;
  normalized: string;
  intent: SearchIntent;
  categorySlugs: string[];
  itemTerms: string[];
  /** Synonym-expanded variants of item/service terms for retrieval. */
  expandedTerms: string[];
  serviceTerms: string[];
  attributes: string[];
  pricePreference: PricePreference | null;
  /** Hard rupee cap from phrases like "under ₹300". Stored in paise. */
  maxPriceCents: number | null;
  qualityPreference: "best" | null;
  location: ParsedLocation;
  openNow: boolean;
  freeTextTokens: string[];
};

/**
 * Compact intent object matching product docs, e.g.
 * `{ item: "chicken curry", category: "restaurant", location: "current", … }`.
 */
export type SearchIntentSummary = {
  item: string | null;
  category: string | null;
  location: "current" | string | null;
  intent: SearchIntent;
  qualityPreference: "best" | null;
  pricePreference: PricePreference | null;
  maxPriceCents: number | null;
  openNow: boolean;
  attributes: string[];
};

export type LocationContext = {
  lat?: number;
  lng?: number;
  areaSlug?: string;
  label?: string;
  radiusM?: number;
};

/** Explicit filters applied after parse (API / UI). */
export type SearchFilters = {
  /** Max distance in meters (overrides default radius when set). */
  distanceM?: number;
  /** Minimum average rating (1–5). */
  minRating?: number;
  /** Price levels 1–4. */
  priceLevels?: number[];
  openNow?: boolean;
  categorySlugs?: string[];
  /** Attribute keys (e.g. vegetarian, outdoor_seating). */
  attributes?: string[];
  /** Require matching service name tokens. */
  services?: string[];
  /** Only businesses with an active offer. */
  hasOffers?: boolean;
  /** Only businesses whose verification has been completed. */
  verifiedOnly?: boolean;
};

export type SearchCandidate = {
  businessId: string;
  name: string;
  slug: string;
  avgRating: number;
  reviewCount: number;
  completeness: number;
  isClaimed: boolean;
  /** Only true when businesses.verified_at is set — never from payment */
  isVerified?: boolean;
  distanceM: number | null;
  ftsRank: number;
  trgmSim: number;
  itemMatchScore: number;
  relevance: number;
  matchedVia: string;
  matchedItemName?: string | null;
  /** Price of the matched dish/service in paise, when known. */
  matchedItemPriceCents?: number | null;
  phone?: string | null;
  priceLevel?: number | null;
  suburb?: string | null;
  city?: string | null;
  openNow?: boolean | null;
  popularityScore?: number;
  freshnessScore?: number;
  categories?: string[];
  imageUrl?: string | null;
  description?: string | null;
  hasOffer?: boolean;
};

export type RankedSearchResult = SearchCandidate & {
  score: number;
  scoreBreakdown: Record<string, number>;
};

/** Recommended = multi-signal ranking; never “rating alone”. */
export type SearchSort = "relevance" | "recommended" | "distance" | "rating" | "reviews";

export type SearchRequest = {
  query: string;
  location?: LocationContext;
  filters?: SearchFilters;
  page?: number;
  pageSize?: number;
  sort?: SearchSort;
  /** Anonymous session id for analytics correlation (no PII required). */
  sessionId?: string;
};

export type SearchResponse = {
  query: ParsedSearchQuery;
  /** Compact intent summary for clients / debugging. */
  intent: SearchIntentSummary;
  /** Organic results only — never paid-boosted. */
  results: RankedSearchResult[];
  /**
   * Paid placements — separate from organic ranking.
   * UI must label these (e.g. “Sponsored”). Empty when flag off.
   */
  sponsored?: SponsoredResult[];
  total: number;
  page: number;
  pageSize: number;
  latencyMs: number;
  /** Opaque id for click/action attribution when analytics persists. */
  searchEventId?: string | null;
};

export type SearchActionType =
  "click" | "call" | "directions" | "website" | "save" | "share";
