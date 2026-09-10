import { describe, expect, it } from "vitest";
import { AREA_CENTROIDS } from "@/config/geo-areas";
import {
  discoverySearchHref,
  resolveSearchLocation,
} from "@/lib/search/resolve-search-location";

const gps = { lat: 18.52, lng: 73.85 };

describe("resolveSearchLocation", () => {
  it("uses the named area in the query even when the dropdown differs", () => {
    const resolved = resolveSearchLocation({
      query: "Perfume in Wagholi",
      dropdownArea: "kharadi",
      devicePosition: gps,
    });

    expect(resolved).toEqual({
      area: "wagholi",
      position: AREA_CENTROIDS.wagholi!.position,
      source: "query",
    });
  });

  it("uses the dropdown neighbourhood when the query has no place name", () => {
    const resolved = resolveSearchLocation({
      query: "Perfume",
      dropdownArea: "wagholi",
      devicePosition: gps,
    });

    expect(resolved).toEqual({
      area: "wagholi",
      position: AREA_CENTROIDS.wagholi!.position,
      source: "dropdown",
    });
  });

  it("keeps device coordinates for near-me queries", () => {
    const resolved = resolveSearchLocation({
      query: "Perfume near me",
      dropdownArea: "wagholi",
      devicePosition: gps,
    });

    expect(resolved).toEqual({
      position: gps,
      source: "device",
    });
  });

  it("builds a search URL that carries the winning area", () => {
    const href = discoverySearchHref({
      query: "Perfume",
      dropdownArea: "wagholi",
      devicePosition: gps,
    });
    const params = new URL(href, "https://apnapick.test").searchParams;

    expect(params.get("q")).toBe("Perfume");
    expect(params.get("area")).toBe("wagholi");
    expect(params.get("lat")).toBe(String(AREA_CENTROIDS.wagholi!.position.lat));
    expect(params.get("lng")).toBe(String(AREA_CENTROIDS.wagholi!.position.lng));
  });
});
