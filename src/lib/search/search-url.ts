import type { DiscoveryLocation } from "@/domain/geo/types";
import type { SearchFilters, SearchSort } from "@/domain/search/types";

type SearchUrlOptions = {
  query: string;
  area?: string;
  sort: SearchSort;
  openNow?: boolean;
  filters?: SearchFilters;
  location: DiscoveryLocation;
  overrides?: Record<string, string | null | undefined>;
};

export function buildSearchHref({
  query,
  area,
  sort,
  openNow,
  filters,
  location,
  overrides = {},
}: SearchUrlOptions) {
  const params = new URLSearchParams({ q: query, sort });
  if (area) params.set("area", area);
  if (openNow) params.set("open_now", "1");
  if (filters?.distanceM) params.set("radius_m", String(filters.distanceM));
  if (filters?.minRating) params.set("min_rating", String(filters.minRating));
  if (filters?.priceLevels?.length) {
    params.set("price", filters.priceLevels.join(","));
  }
  if (filters?.verifiedOnly) params.set("verified", "1");
  if (filters?.hasOffers) params.set("has_offers", "1");
  if (filters?.categorySlugs?.length) {
    params.set("category", filters.categorySlugs.join(","));
  }
  params.set("lat", String(location.position.lat));
  params.set("lng", String(location.position.lng));
  if (location.areaSlug) params.set("area", location.areaSlug);

  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) params.delete(key);
    else if (value !== undefined) params.set(key, value);
  }

  return `/search?${params.toString()}`;
}
