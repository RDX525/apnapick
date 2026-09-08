import { describe, expect, it } from "vitest";
import {
  AREA_CENTROIDS,
  DISCOVERY_AREA_SLUGS,
  nearestAreaSlug,
  nearestAreaSlugAmong,
  nearestDiscoveryArea,
} from "@/config/geo-areas";

describe("nearestAreaSlugAmong", () => {
  it("selects Wagholi, Kharadi, and Lohegaon from their centroids", () => {
    expect(
      nearestAreaSlugAmong(AREA_CENTROIDS.wagholi!.position, DISCOVERY_AREA_SLUGS),
    ).toBe("wagholi");
    expect(
      nearestAreaSlugAmong(AREA_CENTROIDS.kharadi!.position, DISCOVERY_AREA_SLUGS),
    ).toBe("kharadi");
    expect(
      nearestAreaSlugAmong(AREA_CENTROIDS.lohegaon!.position, DISCOVERY_AREA_SLUGS),
    ).toBe("lohegaon");
  });

  it("returns null when the point is far from every candidate", () => {
    expect(
      nearestAreaSlugAmong({ lat: 19.076, lng: 72.8777 }, DISCOVERY_AREA_SLUGS),
    ).toBeNull();
  });
});

describe("nearestDiscoveryArea", () => {
  it("snaps GPS to named neighbourhoods such as Wagholi and Kharadi", () => {
    expect(nearestDiscoveryArea(AREA_CENTROIDS.wagholi!.position)).toBe("wagholi");
    expect(nearestDiscoveryArea(AREA_CENTROIDS.kharadi!.position)).toBe("kharadi");
  });

  it("falls back to Pune when the point is far away", () => {
    expect(nearestDiscoveryArea({ lat: 19.076, lng: 72.8777 })).toBe("pune");
  });
});

describe("nearestAreaSlug", () => {
  it("still matches Hinjewadi", () => {
    expect(nearestAreaSlug(AREA_CENTROIDS.hinjewadi!.position)).toBe("hinjewadi");
  });
});
