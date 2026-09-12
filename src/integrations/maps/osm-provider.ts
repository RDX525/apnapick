import type {
  GeocodeResult,
  LatLng,
  MapsProvider,
  ReverseGeocodeResult,
} from "@/domain/geo/types";
import { AREA_CENTROIDS, discoveryAreaFromPlaceName, nearestAreaSlug } from "@/config/geo-areas";
import { mapsDirectionsUrl } from "@/lib/geo/directions";

const NOMINATIM_TIMEOUT_MS = 5_000;

/** Neighbourhood matches for a typed query, including longer street addresses. */
export function dictionaryGeocodeMatches(query: string): GeocodeResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const compact = q.replace(/\s+/g, "-");

  return Object.entries(AREA_CENTROIDS)
    .filter(([slug, meta]) => {
      const label = meta.label.toLowerCase();
      const slugWords = slug.replace(/-/g, " ");
      return (
        label === q ||
        slug === compact ||
        label.includes(q) ||
        slug.includes(compact) ||
        q.includes(label) ||
        q.includes(slugWords)
      );
    })
    .sort((a, b) => {
      const aLabel = a[1].label.toLowerCase();
      const bLabel = b[1].label.toLowerCase();
      const aExact = aLabel === q || a[0] === compact ? 1 : 0;
      const bExact = bLabel === q || b[0] === compact ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      return bLabel.length - aLabel.length;
    })
    .map(([slug, meta]) => ({
      id: `area:${slug}`,
      label: meta.label,
      position: meta.position,
      areaSlug: slug,
      source: "area_dictionary" as const,
    }));
}

export type NominatimHit = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  class?: string;
  type?: string;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
  };
};

/** Prefer a street/building pin over a neighbourhood centroid. */
export function nominatimStreetScore(hit: NominatimHit, query = ""): number {
  let score = 0;
  if (hit.address?.house_number) score += 40;
  if (hit.address?.road || hit.address?.pedestrian) score += 20;
  if (
    hit.class === "building" ||
    hit.type === "house" ||
    hit.type === "residential" ||
    hit.type === "yes"
  ) {
    score += 15;
  }
  if (hit.class === "highway") score += 18;
  if (
    hit.class === "place" &&
    (hit.type === "city" ||
      hit.type === "town" ||
      hit.type === "suburb" ||
      hit.type === "neighbourhood" ||
      hit.type === "state")
  ) {
    score -= 25;
  }
  if (query) {
    const hay = hit.display_name.toLowerCase();
    for (const token of query
      .toLowerCase()
      .split(/[\s,]+/)
      .filter(Boolean)) {
      if (token.length <= 1 && !/^\d+$/.test(token)) continue;
      if (hay.includes(token)) score += 8;
    }
  }
  return score;
}

export function sortNominatimHits(hits: NominatimHit[], query = ""): NominatimHit[] {
  return [...hits].sort(
    (a, b) => nominatimStreetScore(b, query) - nominatimStreetScore(a, query),
  );
}

const REGION_TAIL = /^(india|maharashtra|maharastra)$/i;
const POSTCODE = /^\d{6}$/;
const UNIT_OR_HOUSE_PREFIX =
  /^(?:(?:shop|unit|plot|office|flat|floor|gala|s\.?no\.?|survey)\s*)?\d+[A-Za-z]?(?:\s*[-/]\s*\d+[A-Za-z]?)?\s*,?\s*/i;

/** Nominatim often misses shop/house prefixes and postal tails. */
export function exactGeocodeQueries(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const core = parts.filter((part) => !POSTCODE.test(part) && !REGION_TAIL.test(part));
  const coreJoined = core.join(", ");
  const stripped = coreJoined.replace(UNIT_OR_HOUSE_PREFIX, "").trim();

  const out: string[] = [];
  const push = (value: string) => {
    const next = value.replace(/\s+/g, " ").trim();
    if (next && !out.includes(next)) out.push(next);
  };

  if (stripped && stripped !== coreJoined) push(stripped);
  if (coreJoined) push(coreJoined);
  push(trimmed);
  return out;
}

function nominatimQuery(query: string): string {
  const trimmed = query.trim();
  if (/pune/i.test(trimmed) && /india/i.test(trimmed)) return trimmed;
  if (/pune/i.test(trimmed)) return `${trimmed}, India`;
  return `${trimmed}, Pune, India`;
}

function nominatimHitsToResults(rows: NominatimHit[], query = ""): GeocodeResult[] {
  return sortNominatimHits(rows, query).map((row) => {
    const position = {
      lat: Number(row.lat),
      lng: Number(row.lon),
    };
    return {
      id: `nom:${row.place_id}`,
      label: row.display_name.split(",").slice(0, 3).join(",").trim(),
      position,
      areaSlug: nearestAreaSlug(position),
      source: "places" as const,
    };
  });
}

/**
 * OpenStreetMap + Nominatim based MapsProvider.
 * Tile rendering is client-side (Leaflet); geocode uses Nominatim with
 * dictionary fallback so discovery still works offline / when Nominatim fails.
 */
export class OsmMapsProvider implements MapsProvider {
  readonly id = "osm";
  readonly tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  readonly attribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  readonly defaultZoom = 13;

  get defaultCenter(): LatLng {
    return AREA_CENTROIDS.kharadi!.position;
  }

  async geocode(
    query: string,
    bias?: LatLng,
    options?: { exact?: boolean },
  ): Promise<GeocodeResult[]> {
    const q = query.trim();
    if (!q) return [];

    const fromDict = dictionaryGeocodeMatches(q);
    const tokenCount = q.split(/[\s,]+/).filter(Boolean).length;
    if (!options?.exact && fromDict.length > 0 && tokenCount <= 2) {
      return fromDict.slice(0, 8);
    }

    const queries = options?.exact ? exactGeocodeQueries(q) : [q];
    try {
      for (const candidate of queries) {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", nominatimQuery(candidate));
        url.searchParams.set("format", "json");
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("limit", options?.exact ? "8" : "6");
        url.searchParams.set("countrycodes", "in");
        if (bias && !options?.exact) {
          url.searchParams.set(
            "viewbox",
            `${bias.lng - 0.2},${bias.lat + 0.2},${bias.lng + 0.2},${bias.lat - 0.2}`,
          );
          url.searchParams.set("bounded", "1");
        }

        const res = await fetch(url.toString(), {
          signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
          headers: {
            Accept: "application/json",
            "User-Agent": "ApnaPick/1.0 (local-discovery)",
          },
          ...(options?.exact
            ? { cache: "no-store" as const }
            : { next: { revalidate: 3600 } }),
        });
        if (!res.ok) continue;
        const places = nominatimHitsToResults(
          (await res.json()) as NominatimHit[],
          candidate,
        );
        if (places.length > 0) return places;
      }
    } catch {
      // Fall through to the neighbourhood dictionary unless this is an exact pin.
    }

    if (options?.exact) return [];
    return fromDict.slice(0, 8);
  }

  async reverseGeocode(position: LatLng): Promise<ReverseGeocodeResult | null> {
    const namedFromPin = discoveryAreaFromPlaceName(
      nearestAreaSlug(position) ? AREA_CENTROIDS[nearestAreaSlug(position)!]?.label : null,
    );

    try {
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("lat", String(position.lat));
      url.searchParams.set("lon", String(position.lng));
      url.searchParams.set("format", "json");
      url.searchParams.set("zoom", "14");

      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
        headers: {
          Accept: "application/json",
          "User-Agent": "ApnaPick/1.0 (local-discovery)",
        },
        next: { revalidate: 3600 },
      });
      if (!res.ok) {
        const areaSlug = namedFromPin ?? nearestAreaSlug(position);
        const area = areaSlug ? AREA_CENTROIDS[areaSlug] : null;
        return area
          ? {
              label: area.label,
              areaSlug,
              city: "Pune",
              suburb: area.label,
            }
          : null;
      }

      const data = (await res.json()) as {
        display_name?: string;
        address?: {
          suburb?: string;
          neighbourhood?: string;
          city?: string;
          town?: string;
        };
      };

      const suburb =
        data.address?.suburb ?? data.address?.neighbourhood ?? null;
      const city = data.address?.city ?? data.address?.town ?? "Pune";
      const named =
        discoveryAreaFromPlaceName(suburb) ??
        discoveryAreaFromPlaceName(data.display_name);
      const areaSlug = named ?? nearestAreaSlug(position);
      const area = areaSlug ? AREA_CENTROIDS[areaSlug] : null;

      return {
        label:
          named && AREA_CENTROIDS[named]
            ? AREA_CENTROIDS[named]!.label
            : suburb && city
              ? `${suburb}, ${city}`
            : (data.display_name?.split(",").slice(0, 2).join(",") ??
              area?.label ??
              "Selected location"),
        areaSlug,
        suburb: suburb ?? area?.label ?? null,
        city,
      };
    } catch {
      const areaSlug = namedFromPin ?? nearestAreaSlug(position);
      const area = areaSlug ? AREA_CENTROIDS[areaSlug] : null;
      return area
        ? { label: area.label, areaSlug, city: "Pune", suburb: area.label }
        : null;
    }
  }

  getDirectionsUrl(input: {
    destination: LatLng;
    destinationLabel?: string;
    origin?: LatLng | null;
  }): string {
    return mapsDirectionsUrl(input);
  }
}

export function createMapsProvider(): MapsProvider {
  return new OsmMapsProvider();
}
