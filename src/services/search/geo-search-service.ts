import { PUNE_AREAS } from "@/domain/catalog/lexicon";
import type { LocationContext } from "@/domain/search/types";
import { haversineMeters } from "@/lib/geo/distance";

/**
 * Geographic helpers for search.
 * Distance filtering at scale uses PostGIS `ST_DWithin` in Postgres;
 * this service handles app-side distance, named-area resolution, and
 * privacy-safe coarse location for analytics.
 */
export class GeoSearchService {
  resolveNamedArea(areaSlug?: string | null): {
    slug: string;
    label: string;
  } | null {
    if (!areaSlug) return null;
    const meta = PUNE_AREAS[areaSlug];
    if (!meta) return { slug: areaSlug, label: areaSlug };
    return { slug: areaSlug, label: meta.label };
  }

  withDistances<T extends { lat?: number | null; lng?: number | null }>(
    items: T[],
    location: LocationContext | undefined,
  ): (T & { distanceM: number | null })[] {
    if (location?.lat == null || location?.lng == null) {
      return items.map((item) => ({ ...item, distanceM: null }));
    }

    return items.map((item) => {
      if (item.lat == null || item.lng == null) {
        return { ...item, distanceM: null };
      }
      return {
        ...item,
        distanceM: haversineMeters(location.lat!, location.lng!, item.lat, item.lng),
      };
    });
  }

  filterByRadius<T extends { distanceM: number | null }>(
    items: T[],
    radiusM: number,
  ): T[] {
    return items.filter((item) => item.distanceM == null || item.distanceM <= radiusM);
  }

  /**
   * Analytics must not store precise personal GPS.
   * Prefer suburb/city/area slug; drop lat/lng from event payloads.
   */
  coarsenForAnalytics(location?: LocationContext): {
    areaSlug: string | null;
    label: string | null;
    radiusM: number | null;
  } {
    const named = this.resolveNamedArea(location?.areaSlug);
    return {
      areaSlug: named?.slug ?? location?.areaSlug ?? null,
      label: named?.label ?? location?.label ?? null,
      radiusM: location?.radiusM ?? null,
    };
  }

  effectiveRadiusM(location?: LocationContext, filterDistanceM?: number): number {
    if (filterDistanceM != null && filterDistanceM > 0) return filterDistanceM;
    return location?.radiusM ?? Number(process.env.SEARCH_DEFAULT_RADIUS_M ?? 8000);
  }
}

export const geoSearchService = new GeoSearchService();
