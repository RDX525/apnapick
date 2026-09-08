import { describe, expect, it } from "vitest";
import { SearchParser } from "@/services/search/search-parser";

const parser = new SearchParser();

describe("SearchParser", () => {
  it("parses best chicken curry near me into the product intent shape", () => {
    const q = parser.parse("best chicken curry near me");
    const summary = parser.summarize(q);

    expect(summary).toMatchObject({
      item: "chicken curry",
      category: "restaurant",
      location: "current",
      intent: "discovery",
      qualityPreference: "best",
    });
    expect(q.location.mode).toBe("near_me");
    expect(q.categorySlugs).toContain("restaurants");
    expect(q.expandedTerms.length).toBeGreaterThan(0);
    expect(q.expandedTerms.some((t) => t.includes("curry"))).toBe(true);
  });

  it("parses cheap vegetarian food in Pune", () => {
    const q = parser.parse("cheap vegetarian food in Pune");
    expect(q.pricePreference).toBe("cheap");
    expect(q.location.mode).toBe("named");
    expect(q.location.areaSlug).toBe("pune");
    expect(q.attributes).toContain("vegetarian");
    expect(q.categorySlugs).toContain("restaurants");
  });

  it("parses South Indian restaurant open now", () => {
    const q = parser.parse("South Indian restaurant open now");
    expect(q.openNow).toBe(true);
    expect(q.attributes).toContain("south_indian");
    expect(q.categorySlugs).toContain("restaurants");
  });

  it("parses best barber for fade near me", () => {
    const q = parser.parse("best barber for fade near me");
    expect(q.categorySlugs).toContain("barbers");
    expect(q.location.mode).toBe("near_me");
    expect(q.qualityPreference).toBe("best");
  });

  it("parses plumber for leaking tap", () => {
    const q = parser.parse("plumber for leaking tap");
    expect(q.categorySlugs).toContain("plumbers");
    expect(q.intent).toBe("service");
  });
});
