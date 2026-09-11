import type { DashboardWorkspace } from "@/domain/dashboard/types";
import type { GeocodeResult, LatLng } from "@/domain/geo/types";
import { AREA_CENTROIDS } from "@/config/geo-areas";
import { AppError } from "@/lib/errors/app-error";

export type GeocodeFn = (
  query: string,
  bias?: LatLng,
  options?: { exact?: boolean },
) => Promise<GeocodeResult[]>;

function hasCoords(lat: number | null | undefined, lng: number | null | undefined) {
  return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
}

function biasForProfile(workspace: DashboardWorkspace): LatLng {
  const suburb = workspace.profile.suburb.trim().toLowerCase().replace(/\s+/g, "-");
  return AREA_CENTROIDS[suburb]?.position ?? AREA_CENTROIDS.kharadi!.position;
}

function addressQuery(workspace: DashboardWorkspace): string {
  return [
    workspace.profile.addressLine1,
    workspace.profile.suburb,
    workspace.profile.city || "Pune",
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * Ensure a listing save has lat/lng when the owner typed an address but has
 * no pin yet. Existing locations can still update address text without a pin.
 */
export async function resolveOwnerLocationForSave(
  workspace: DashboardWorkspace,
  options: {
    hasPrimaryLocation: boolean;
    geocode: GeocodeFn;
  },
): Promise<DashboardWorkspace> {
  const profile = workspace.profile;
  if (hasCoords(profile.lat, profile.lng)) return workspace;

  const query = addressQuery(workspace);
  if (!profile.addressLine1.trim()) return workspace;

  const bias = biasForProfile(workspace);
  let results = await options.geocode(query, bias, { exact: true });
  if (!results[0]) {
    results = await options.geocode(query, bias);
  }
  const hit = results[0];
  if (hit) {
    return {
      ...workspace,
      profile: {
        ...profile,
        lat: hit.position.lat,
        lng: hit.position.lng,
      },
    };
  }

  if (!options.hasPrimaryLocation) {
    throw new AppError({
      message:
        "We couldn’t place that address on the map. Add a fuller street address or drop a pin.",
      code: "LOCATION_REQUIRED",
      status: 400,
      expose: true,
    });
  }

  return workspace;
}
