import type {
  LocationContext,
  ParsedSearchQuery,
  SearchCandidate,
  SearchFilters,
} from "@/domain/search/types";
import type { SearchEngine, SearchRetrieveOptions } from "@/domain/search/search-engine";
import { haversineMeters } from "@/lib/geo/distance";
import {
  PUNE_DEMO_BUSINESSES,
  demoToCandidate,
  type DemoBusiness,
} from "@/repositories/search/demo-catalog";
import { listingMatchesNamedArea } from "@/lib/search/named-area";

export type { SearchEngine, SearchRepository } from "@/domain/search/search-engine";

function tokenOverlap(haystack: string, needle: string): number {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase().trim();
  if (!n) return 0;
  if (h.includes(n)) return 1;
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 0;
  const hits = parts.filter((p) => h.includes(p)).length;
  return hits / parts.length;
}

function fuzzyNameSim(a: string, b: string): number {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.85;
  return tokenOverlap(x, y) * 0.7;
}

function scoreBusiness(
  b: DemoBusiness,
  parsed: ParsedSearchQuery,
  location?: LocationContext,
  filters?: SearchFilters,
): SearchCandidate | null {
  const haystack = [
    b.name,
    b.description,
    ...b.categories,
    ...b.attributes,
    ...b.products,
    ...b.services,
  ]
    .join(" ")
    .toLowerCase();

  const queryBits = [
    ...parsed.itemTerms,
    ...parsed.expandedTerms,
    ...parsed.serviceTerms,
    ...parsed.freeTextTokens,
    ...parsed.attributes,
  ];

  let itemMatchScore = 0;
  let matchedItemName: string | null = null;
  let matchedItemPriceCents: number | null = null;

  for (const term of [
    ...parsed.itemTerms,
    ...parsed.expandedTerms,
    ...parsed.serviceTerms,
  ]) {
    for (const product of b.products) {
      const s = tokenOverlap(product, term);
      if (s > itemMatchScore) {
        itemMatchScore = s;
        matchedItemName = product;
        matchedItemPriceCents = b.productPrices?.[product] ?? null;
      }
    }
    for (const service of b.services) {
      const s = tokenOverlap(service, term);
      if (s > itemMatchScore) {
        itemMatchScore = s;
        matchedItemName = service;
        matchedItemPriceCents = b.servicePrices?.[service] ?? null;
      }
    }
  }

  const ftsRank = Math.max(
    tokenOverlap(haystack, parsed.normalized),
    ...queryBits.map((t) => tokenOverlap(haystack, t)),
    0,
  );
  const trgmSim = Math.max(
    fuzzyNameSim(b.name, parsed.normalized),
    ...parsed.itemTerms.map((t) => fuzzyNameSim(b.name, t)),
  );

  const categorySlugs =
    filters?.categorySlugs && filters.categorySlugs.length > 0
      ? filters.categorySlugs
      : parsed.categorySlugs;

  if (categorySlugs.length > 0) {
    const ok = categorySlugs.some((c) => b.categories.includes(c));
    if (!ok) return null;
  }

  const attrs = [
    ...new Set([...(parsed.attributes ?? []), ...(filters?.attributes ?? [])]),
  ];
  if (attrs.length > 0) {
    const required = attrs.filter((a) =>
      [
        "vegetarian",
        "vegan",
        "jain",
        "north_indian",
        "south_indian",
        "maharashtrian",
        "chinese",
        "italian",
        "biryani",
      ].includes(a),
    );
    if (required.length > 0 && !required.every((a) => b.attributes.includes(a))) {
      return null;
    }
  }

  const openNow = filters?.openNow ?? (parsed.openNow ? true : undefined);
  if (openNow === true && !b.openNow) return null;

  if (filters?.minRating != null && b.avgRating < filters.minRating) return null;

  if (filters?.priceLevels && filters.priceLevels.length > 0) {
    if (!filters.priceLevels.includes(b.priceLevel)) return null;
  } else if (parsed.pricePreference === "cheap" && b.priceLevel > 2) {
    return null;
  } else if (parsed.pricePreference === "premium" && b.priceLevel < 3) {
    return null;
  }

  if (filters?.services && filters.services.length > 0) {
    const ok = filters.services.some((s) =>
      b.services.some((bs) => tokenOverlap(bs, s) > 0.4),
    );
    if (!ok) return null;
  }

  const hasSignal =
    ftsRank > 0.15 ||
    itemMatchScore > 0.2 ||
    trgmSim > 0.35 ||
    (categorySlugs.length > 0 && queryBits.length === 0);

  if (!hasSignal && parsed.normalized.length > 0) return null;

  let distanceM: number | null = null;
  if (location?.lat != null && location?.lng != null) {
    distanceM = haversineMeters(location.lat, location.lng, b.lat, b.lng);
  }

  const radius = filters?.distanceM ?? location?.radiusM ?? 12000;
  const namedSlug =
    parsed.location.mode === "named" ? parsed.location.areaSlug : undefined;
  const inNamedSuburb = listingMatchesNamedArea(b.suburb, b.city, namedSlug);

  if (namedSlug && namedSlug !== "pune") {
    const nearby = distanceM != null && distanceM <= radius;
    if (!inNamedSuburb && !nearby) return null;
  } else if (distanceM != null && distanceM > radius) {
    return null;
  }

  const relevance =
    0.45 * ftsRank +
    0.25 * trgmSim +
    0.2 * itemMatchScore +
    0.1 * (distanceM == null ? 0.5 : Math.max(0, 1 - distanceM / 10000));

  return demoToCandidate(b, {
    distanceM,
    ftsRank,
    trgmSim,
    itemMatchScore,
    relevance,
    matchedVia: itemMatchScore > 0.3 ? "product" : ftsRank > trgmSim ? "fts" : "trgm",
    matchedItemName,
    matchedItemPriceCents,
  });
}

/**
 * In-memory engine for unit tests only.
 * Production paths must use PostgresSearchRepository or EmptySearchRepository.
 */
export class InMemorySearchRepository implements SearchEngine {
  readonly name = "in-memory-demo";

  constructor(private readonly catalog = PUNE_DEMO_BUSINESSES) {}

  async retrieve(
    parsed: ParsedSearchQuery,
    options?: SearchRetrieveOptions,
  ): Promise<SearchCandidate[]> {
    const out: SearchCandidate[] = [];
    for (const b of this.catalog) {
      const scored = scoreBusiness(b, parsed, options?.location, options?.filters);
      if (scored) out.push(scored);
    }
    return out;
  }
}

/** Production-safe empty repository when Supabase is not configured. */
export class EmptySearchRepository implements SearchEngine {
  readonly name = "empty";

  async retrieve(): Promise<SearchCandidate[]> {
    return [];
  }
}
