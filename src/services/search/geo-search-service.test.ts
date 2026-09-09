import { describe, expect, it } from "vitest";
import { AREA_CENTROIDS } from "@/config/geo-areas";
import { geoSearchService } from "@/services/search/geo-search-service";

describe("GeoSearchService named areas", () => {
  it("resolves Wagholi to its discovery centroid", () => {
    const named = geoSearchService.resolveNamedArea("wagholi");
    expect(named).toMatchObject({
      slug: "wagholi",
      label: "Wagholi",
      lat: AREA_CENTROIDS.wagholi!.position.lat,
      lng: AREA_CENTROIDS.wagholi!.position.lng,
    });
  });

  it("snaps a Pune CBD pin to Wagholi when the query names that area", () => {
    const origin = geoSearchService.withNamedAreaOrigin(
      { lat: 18.5204, lng: 73.8567, radiusM: 8000, areaSlug: "pune" },
      "wagholi",
    );
    expect(origin.areaSlug).toBe("wagholi");
    expect(origin.lat).toBe(AREA_CENTROIDS.wagholi!.position.lat);
    expect(origin.lng).toBe(AREA_CENTROIDS.wagholi!.position.lng);
  });
});
