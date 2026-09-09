import "server-only";

import { getMapsProvider } from "@/integrations/maps/get-maps-provider";
import {
  queryBusinessCoordinates,
  queryNearbyBusinesses,
} from "@/repositories/geo/nearby-repository";
import type {
  DiscoveryLocation,
  GeocodeResult,
  LatLng,
  NearbyBusiness,
  ReverseGeocodeResult,
} from "@/domain/geo/types";
import { AREA_CENTROIDS, isPlatformAreaSlug } from "@/config/geo-areas";
import { mapsDirectionsUrl } from "@/lib/geo/directions";

export async function geocodeLocation(
  query: string,
  bias?: LatLng,
  options?: { exact?: boolean },
): Promise<GeocodeResult[]> {
  return getMapsProvider().geocode(query, bias, options);
}

export async function reverseGeocodeLocation(
  position: LatLng,
): Promise<ReverseGeocodeResult | null> {
  return getMapsProvider().reverseGeocode(position);
}

export async function findNearbyBusinesses(input: {
  lat: number;
  lng: number;
  radiusM?: number;
  limit?: number;
}): Promise<NearbyBusiness[]> {
  return queryNearbyBusinesses(input);
}

export async function enrichWithCoordinates(
  businessIds: string[],
): Promise<Record<string, { lat: number; lng: number; suburb: string | null }>> {
  return queryBusinessCoordinates(businessIds);
}

export function directionsUrl(input: {
  destination: LatLng;
  destinationLabel?: string;
  origin?: LatLng | null;
}): string {
  return mapsDirectionsUrl(input);
}

export function defaultDiscoveryLocation(): DiscoveryLocation {
  const kharadi = AREA_CENTROIDS.kharadi!;
  return {
    position: kharadi.position,
    label: kharadi.label,
    areaSlug: "kharadi",
    source: "default",
  };
}

export function locationFromAreaSlug(slug: string): DiscoveryLocation | null {
  if (!isPlatformAreaSlug(slug)) return null;
  const area = AREA_CENTROIDS[slug];
  if (!area) return null;
  return {
    position: area.position,
    label: area.label,
    areaSlug: slug,
    source: "manual",
  };
}
