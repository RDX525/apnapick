import { AREA_CENTROIDS, isDiscoveryAreaSlug } from "@/config/geo-areas";
import type { LatLng } from "@/domain/geo/types";
import { searchParser } from "@/services/search/search-parser";

export type ResolvedSearchLocation = {
  area?: string;
  position?: LatLng;
  source: "query" | "dropdown" | "device" | "none";
};

/**
 * Textbox named area ("Perfume in Wagholi") wins.
 * Otherwise the neighbourhood dropdown is the origin.
 * "near me" / Current location keep device coordinates.
 */
export function resolveSearchLocation(input: {
  query: string;
  dropdownArea?: string | null;
  devicePosition?: LatLng | null;
}): ResolvedSearchLocation {
  const parsed = searchParser.parse(input.query);
  const namedSlug =
    parsed.location.mode === "named" ? parsed.location.areaSlug : undefined;

  if (namedSlug && namedSlug !== "pune") {
    const centroid = AREA_CENTROIDS[namedSlug];
    return {
      area: namedSlug,
      position: centroid?.position ?? input.devicePosition ?? undefined,
      source: "query",
    };
  }

  if (parsed.location.mode === "near_me") {
    return {
      position: input.devicePosition ?? undefined,
      source: input.devicePosition ? "device" : "none",
    };
  }

  const dropdown = input.dropdownArea?.trim() ?? "";
  if (isDiscoveryAreaSlug(dropdown)) {
    const centroid = AREA_CENTROIDS[dropdown];
    return {
      area: dropdown,
      position: centroid?.position ?? input.devicePosition ?? undefined,
      source: "dropdown",
    };
  }

  return {
    position: input.devicePosition ?? undefined,
    source: input.devicePosition ? "device" : "none",
  };
}

export function discoverySearchHref(input: {
  query: string;
  dropdownArea?: string | null;
  devicePosition?: LatLng | null;
}): string {
  const resolved = resolveSearchLocation(input);
  const params = new URLSearchParams({ q: input.query });
  if (resolved.position) {
    params.set("lat", String(resolved.position.lat));
    params.set("lng", String(resolved.position.lng));
  }
  if (resolved.area) params.set("area", resolved.area);
  return `/search?${params.toString()}`;
}
