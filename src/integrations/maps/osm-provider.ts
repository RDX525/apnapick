import type {
  GeocodeResult,
  LatLng,
  MapsProvider,
  ReverseGeocodeResult,
} from "@/domain/geo/types";
import { AREA_CENTROIDS, nearestAreaSlug } from "@/config/geo-areas";
import { getPublicEnv } from "@/config/env";
import { mapsDirectionsUrl } from "@/lib/geo/directions";

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
    const env = getPublicEnv();
    return {
      lat: env.NEXT_PUBLIC_DEFAULT_LAT,
      lng: env.NEXT_PUBLIC_DEFAULT_LNG,
    };
  }

  async geocode(query: string, bias?: LatLng): Promise<GeocodeResult[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const fromDict = Object.entries(AREA_CENTROIDS)
      .filter(
        ([slug, meta]) =>
          slug.includes(q.replace(/\s+/g, "-")) || meta.label.toLowerCase().includes(q),
      )
      .map(([slug, meta]) => ({
        id: `area:${slug}`,
        label: meta.label,
        position: meta.position,
        areaSlug: slug,
        source: "area_dictionary" as const,
      }));

    if (fromDict.length > 0) return fromDict.slice(0, 8);

    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", `${query}, Pune, India`);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "6");
      url.searchParams.set("countrycodes", "in");
      if (bias) {
        url.searchParams.set(
          "viewbox",
          `${bias.lng - 0.2},${bias.lat + 0.2},${bias.lng + 0.2},${bias.lat - 0.2}`,
        );
        url.searchParams.set("bounded", "1");
      }

      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "ApnaPick/1.0 (local-discovery)",
        },
        next: { revalidate: 3600 },
      });
      if (!res.ok) return fromDict;

      const rows = (await res.json()) as {
        place_id: number;
        display_name: string;
        lat: string;
        lon: string;
      }[];

      return rows.map((row) => {
        const position = {
          lat: Number(row.lat),
          lng: Number(row.lon),
        };
        return {
          id: `nom:${row.place_id}`,
          label: row.display_name.split(",").slice(0, 3).join(","),
          position,
          areaSlug: nearestAreaSlug(position),
          source: "places" as const,
        };
      });
    } catch {
      return fromDict;
    }
  }

  async reverseGeocode(position: LatLng): Promise<ReverseGeocodeResult | null> {
    const areaSlug = nearestAreaSlug(position);
    const area = areaSlug ? AREA_CENTROIDS[areaSlug] : null;

    try {
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("lat", String(position.lat));
      url.searchParams.set("lon", String(position.lng));
      url.searchParams.set("format", "json");
      url.searchParams.set("zoom", "14");

      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "ApnaPick/1.0 (local-discovery)",
        },
        next: { revalidate: 3600 },
      });
      if (!res.ok) {
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
        data.address?.suburb ?? data.address?.neighbourhood ?? area?.label ?? null;
      const city = data.address?.city ?? data.address?.town ?? "Pune";

      return {
        label:
          suburb && city
            ? `${suburb}, ${city}`
            : (data.display_name?.split(",").slice(0, 2).join(",") ??
              area?.label ??
              "Selected location"),
        areaSlug,
        suburb,
        city,
      };
    } catch {
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
