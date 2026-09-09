import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OsmMapsProvider,
  dictionaryGeocodeMatches,
  exactGeocodeQueries,
  sortNominatimHits,
  type NominatimHit,
} from "@/integrations/maps/osm-provider";
import { nearestAreaSlug, AREA_CENTROIDS } from "@/config/geo-areas";
import { haversineMeters, formatDistance } from "@/lib/geo/distance";

describe("OsmMapsProvider", () => {
  const provider = new OsmMapsProvider();

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses keyless OpenStreetMap tiles", () => {
    expect(provider.tileUrl).toBe(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    );
    expect(provider.tileUrl).not.toContain("cartocdn.com");
  });

  it("geocodes known Pune areas from the dictionary", async () => {
    const results = await provider.geocode("baner");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.areaSlug).toBe("baner");
    expect(results[0]!.source).toBe("area_dictionary");
  });

  it("matches a neighbourhood inside a longer street address", () => {
    const matches = dictionaryGeocodeMatches(
      "12 World Trade Center, Kharadi, Pune, Maharashtra, India",
    );
    expect(matches.some((item) => item.areaSlug === "kharadi")).toBe(true);
    expect(matches[0]?.areaSlug).toBe("kharadi");
  });

  it("strips shop numbers and postal tails before an exact Nominatim lookup", () => {
    expect(
      exactGeocodeQueries(
        "Shop 12, World Trade Center, Kharadi, Pune, Maharashtra, 411014, India",
      )[0],
    ).toBe("World Trade Center, Kharadi, Pune");
    expect(
      exactGeocodeQueries("12 World Trade Center, Kharadi, Pune")[0],
    ).toBe("World Trade Center, Kharadi, Pune");
    expect(exactGeocodeQueries("Lane 7, Koregaon Park, Pune")[0]).toBe(
      "Lane 7, Koregaon Park, Pune",
    );
  });

  it("ranks a house/street hit above a suburb centroid", () => {
    const suburb: NominatimHit = {
      place_id: 2,
      display_name: "Kharadi, Pune",
      lat: "18.5516",
      lon: "73.947",
      class: "place",
      type: "suburb",
      address: { suburb: "Kharadi", city: "Pune" },
    };
    const house: NominatimHit = {
      place_id: 1,
      display_name: "12 World Trade Center, Kharadi, Pune",
      lat: "18.5512",
      lon: "73.9481",
      class: "building",
      type: "yes",
      address: {
        house_number: "12",
        road: "World Trade Center Road",
        suburb: "Kharadi",
        city: "Pune",
      },
    };
    expect(sortNominatimHits([suburb, house], "12 World Trade Center")[0]?.place_id).toBe(1);
  });

  it("exact geocode pins Nominatim street results, not the area dictionary", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          place_id: 2,
          display_name: "Kharadi, Pune, Maharashtra, India",
          lat: "18.5516",
          lon: "73.947",
          class: "place",
          type: "suburb",
          address: { suburb: "Kharadi", city: "Pune" },
        },
        {
          place_id: 1,
          display_name: "12 World Trade Center, Kharadi, Pune",
          lat: "18.5512",
          lon: "73.9481",
          class: "building",
          type: "yes",
          address: {
            house_number: "12",
            road: "World Trade Center Road",
            suburb: "Kharadi",
            city: "Pune",
          },
        },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);
    const results = await provider.geocode(
      "12 World Trade Center, Kharadi, Pune, Maharashtra, India",
      { lat: 18.52, lng: 73.85 },
      { exact: true },
    );
    expect(results[0]?.source).toBe("places");
    expect(results[0]?.id).toBe("nom:1");
    expect(results[0]?.label).toContain("12");
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).not.toContain("bounded");
    expect(calledUrl).not.toMatch(/Pune, India, Pune/);
  });

  it("exact geocode does not fall back to a neighbourhood centroid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => [],
      }),
    );
    const results = await provider.geocode(
      "12 World Trade Center, Kharadi, Pune",
      undefined,
      { exact: true },
    );
    expect(results).toEqual([]);
  });

  it("builds directions URLs without storing GPS", () => {
    const url = provider.getDirectionsUrl({
      destination: AREA_CENTROIDS.baner!.position,
      destinationLabel: "Baner",
      origin: AREA_CENTROIDS.pune!.position,
    });
    expect(url).toContain("google.com/maps/dir");
    expect(url).toContain("destination");
  });

  it("reverse-geocodes near Koregaon Park via dictionary fallback path", async () => {
    const result = await provider.reverseGeocode(
      AREA_CENTROIDS["koregaon-park"]!.position,
    );
    expect(result?.areaSlug).toBeTruthy();
  });
});

describe("geo helpers", () => {
  it("finds nearest area slug", () => {
    expect(nearestAreaSlug(AREA_CENTROIDS.hinjewadi!.position)).toBe("hinjewadi");
  });

  it("formats distances", () => {
    expect(formatDistance(350)).toBe("350 m");
    expect(haversineMeters(18.52, 73.85, 18.52, 73.85)).toBe(0);
  });
});
