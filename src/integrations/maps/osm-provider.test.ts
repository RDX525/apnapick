import { describe, expect, it } from "vitest";
import { OsmMapsProvider } from "@/integrations/maps/osm-provider";
import { nearestAreaSlug, AREA_CENTROIDS } from "@/config/geo-areas";
import { haversineMeters, formatDistance } from "@/lib/geo/distance";

describe("OsmMapsProvider", () => {
  const provider = new OsmMapsProvider();

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
