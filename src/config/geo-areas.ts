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

/** Neighbourhoods live on the platform right now */
export const DISCOVERY_AREA_SLUGS = ["kharadi", "wagholi", "lohegaon"] as const;

export type DiscoveryAreaSlug = (typeof DISCOVERY_AREA_SLUGS)[number];

/**
 * Snap GPS to a live neighbourhood only when the pin is actually in it.
 * 15 km pulled Viman Nagar / Magarpatta / Pune CBD into the wrong chip.
 */
export const DISCOVERY_AREA_SNAP_RADIUS_M = 1_500;

const DISCOVERY_AREA_ALIASES: Record<DiscoveryAreaSlug, readonly string[]> = {
  kharadi: ["kharadi"],
  wagholi: ["wagholi"],
  lohegaon: ["lohegaon", "lohgaon"],
};

export function isDiscoveryAreaSlug(value: string): value is DiscoveryAreaSlug {
  return (DISCOVERY_AREA_SLUGS as readonly string[]).includes(value);
}

/** Match Nominatim suburb / label text onto Kharadi, Wagholi, or Lohegaon. */
export function discoveryAreaFromPlaceName(
  value: string | null | undefined,
): DiscoveryAreaSlug | null {
  if (!value) return null;
  const hay = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  for (const slug of DISCOVERY_AREA_SLUGS) {
    if (DISCOVERY_AREA_ALIASES[slug].some((alias) => hay.includes(alias))) {
      return slug;
    }
  }
  return null;
}

export function resolveDiscoveryPlace(
  position: LatLng,
  reverse?: {
    suburb?: string | null;
    label?: string | null;
    city?: string | null;
  } | null,
): { areaSlug: DiscoveryAreaSlug | null; label: string } {
  const named =
    discoveryAreaFromPlaceName(reverse?.suburb) ??
    discoveryAreaFromPlaceName(reverse?.label);
  if (named) {
    return { areaSlug: named, label: AREA_CENTROIDS[named]?.label ?? named };
  }
  const near = nearestDiscoveryArea(position);
  if (near) {
    return { areaSlug: near, label: AREA_CENTROIDS[near]?.label ?? near };
  }
  const suburb = reverse?.suburb?.trim();
  if (suburb) return { areaSlug: null, label: suburb };
  const fromLabel = reverse?.label?.trim();
  if (fromLabel) {
    const short = fromLabel
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(", ");
    return { areaSlug: null, label: short || fromLabel };
  }
  return { areaSlug: null, label: "Current location" };
}

/** City-wide Pune hubs plus the live neighbourhoods. */
export function isPlatformAreaSlug(value: string): boolean {
  return value === "pune" || isDiscoveryAreaSlug(value);
}

export function nearestAreaSlug(position: LatLng): string | null {
  return nearestAreaSlugAmong(position, Object.keys(AREA_CENTROIDS));
}

/** Dropdown neighbourhood for a GPS fix — null when the pin is outside the live areas. */
export function nearestDiscoveryArea(position: LatLng): DiscoveryAreaSlug | null {
  const nearest = nearestAreaSlugAmong(
    position,
    DISCOVERY_AREA_SLUGS,
    DISCOVERY_AREA_SNAP_RADIUS_M,
  );
  return nearest && isDiscoveryAreaSlug(nearest) ? nearest : null;
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
