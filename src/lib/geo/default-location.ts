import type { DiscoveryLocation } from "@/domain/geo/types";
import { AREA_CENTROIDS } from "@/config/geo-areas";

/** Client-safe default — no server env import. */
export function defaultDiscoveryLocation(): DiscoveryLocation {
  const pune = AREA_CENTROIDS.pune!;
  return {
    position: pune.position,
    label: pune.label,
    areaSlug: "pune",
    source: "default",
  };
}
