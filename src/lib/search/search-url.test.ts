import { describe, expect, it } from "vitest";
import { buildSearchHref } from "@/lib/search/search-url";

const location = {
  position: { lat: 18.551, lng: 73.94 },
  label: "Kharadi",
  areaSlug: "kharadi",
  source: "search" as const,
};

describe("buildSearchHref", () => {
  it("preserves filters while changing pages", () => {
    const href = buildSearchHref({
      query: "coffee",
      sort: "rating",
      openNow: true,
      filters: {
        distanceM: 5000,
        minRating: 4,
        priceLevels: [1, 2],
        verifiedOnly: true,
        categorySlugs: ["cafes"],
      },
      location,
      overrides: { page: "2" },
    });
    const params = new URL(href, "https://apnapick.test").searchParams;

    expect(params.get("page")).toBe("2");
    expect(params.get("area")).toBe("kharadi");
    expect(params.get("radius_m")).toBe("5000");
    expect(params.get("min_rating")).toBe("4");
    expect(params.get("verified")).toBe("1");
    expect(params.get("category")).toBe("cafes");
  });

  it("clears only explicitly removed filters", () => {
    const href = buildSearchHref({
      query: "coffee",
      sort: "recommended",
      openNow: true,
      filters: { verifiedOnly: true, hasOffers: true },
      location,
      overrides: { verified: null, page: "1" },
    });
    const params = new URL(href, "https://apnapick.test").searchParams;

    expect(params.has("verified")).toBe(false);
    expect(params.get("has_offers")).toBe("1");
    expect(params.get("open_now")).toBe("1");
  });
});
