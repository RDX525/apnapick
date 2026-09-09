import type { DiscoveryLocation } from "@/domain/geo/types";
import { AREA_CENTROIDS } from "@/config/geo-areas";

/** Client-safe default — no server env import. */
export function defaultDiscoveryLocation(): DiscoveryLocation {
  const kharadi = AREA_CENTROIDS.kharadi!;
  return {
    position: kharadi.position,
    label: kharadi.label,
    areaSlug: "kharadi",
    source: "default",
  };
}
