import type { LatLng } from "@/domain/geo/types";
import { haversineMeters } from "@/lib/geo/distance";

/** Approximate centroids for Pune discovery — not precise GPS storage */
export const AREA_CENTROIDS: Record<string, { label: string; position: LatLng }> = {
  pune: { label: "Pune", position: { lat: 18.5204, lng: 73.8567 } },
  "koregaon-park": {
    label: "Koregaon Park",
    position: { lat: 18.5362, lng: 73.8938 },
  },
  baner: { label: "Baner", position: { lat: 18.559, lng: 73.7868 } },
  hinjewadi: { label: "Hinjewadi", position: { lat: 18.5912, lng: 73.7389 } },
  kothrud: { label: "Kothrud", position: { lat: 18.5074, lng: 73.8077 } },
  "viman-nagar": {
    label: "Viman Nagar",
    position: { lat: 18.5679, lng: 73.9143 },
  },
  "fc-road": { label: "FC Road", position: { lat: 18.5289, lng: 73.8412 } },
  aundh: { label: "Aundh", position: { lat: 18.558, lng: 73.807 } },
  wakad: { label: "Wakad", position: { lat: 18.598, lng: 73.763 } },
  kharadi: { label: "Kharadi", position: { lat: 18.551, lng: 73.94 } },
  wagholi: { label: "Wagholi", position: { lat: 18.5808, lng: 73.983 } },
  lohegaon: { label: "Lohegaon", position: { lat: 18.5822, lng: 73.9197 } },
  hadapsar: { label: "Hadapsar", position: { lat: 18.5089, lng: 73.926 } },
  shivajinagar: {
    label: "Shivajinagar",
    position: { lat: 18.5308, lng: 73.8478 },
  },
  camp: { label: "Camp", position: { lat: 18.5126, lng: 73.8782 } },
  deccan: { label: "Deccan", position: { lat: 18.516, lng: 73.841 } },
  "jm-road": { label: "JM Road", position: { lat: 18.52, lng: 73.845 } },
  magarpatta: { label: "Magarpatta", position: { lat: 18.516, lng: 73.932 } },
  "pimple-saudagar": {
    label: "Pimple Saudagar",
    position: { lat: 18.598, lng: 73.8 },
  },
  kondhwa: { label: "Kondhwa", position: { lat: 18.46, lng: 73.89 } },
  bibwewadi: { label: "Bibwewadi", position: { lat: 18.47, lng: 73.86 } },
  swargate: { label: "Swargate", position: { lat: 18.501, lng: 73.862 } },
  "karve-nagar": {
    label: "Karve Nagar",
    position: { lat: 18.49, lng: 73.82 },
  },
};

/** Neighbourhoods shown in the location dropdown */
export const DISCOVERY_AREA_SLUGS = [
  "pune",
  "koregaon-park",
  "baner",
  "hinjewadi",
  "kothrud",
  "viman-nagar",
  "fc-road",
  "wagholi",
  "kharadi",
  "lohegaon",
] as const;

export type DiscoveryAreaSlug = (typeof DISCOVERY_AREA_SLUGS)[number];

export function isDiscoveryAreaSlug(value: string): value is DiscoveryAreaSlug {
  return (DISCOVERY_AREA_SLUGS as readonly string[]).includes(value);
}

export function nearestAreaSlug(position: LatLng): string | null {
  return nearestAreaSlugAmong(position, Object.keys(AREA_CENTROIDS));
}

/** Dropdown neighbourhood for a GPS fix — city-wide Pune when nothing is nearby. */
export function nearestDiscoveryArea(position: LatLng): DiscoveryAreaSlug {
  const nearest = nearestAreaSlugAmong(position, DISCOVERY_AREA_SLUGS);
  return nearest && isDiscoveryAreaSlug(nearest) ? nearest : "pune";
}

/** Nearest named area from `slugs`, or null when all candidates are too far. */
export function nearestAreaSlugAmong(
  position: LatLng,
  slugs: readonly string[],
  maxDistanceM = 15_000,
): string | null {
  let best: { slug: string; d: number } | null = null;
  for (const slug of slugs) {
    const meta = AREA_CENTROIDS[slug];
    if (!meta) continue;
    const d = haversineMeters(
      position.lat,
      position.lng,
      meta.position.lat,
      meta.position.lng,
    );
    if (!best || d < best.d) best = { slug, d };
  }
  if (!best || best.d > maxDistanceM) return null;
  return best.slug;
}
