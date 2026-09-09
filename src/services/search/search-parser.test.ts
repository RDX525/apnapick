import { describe, expect, it } from "vitest";
import { SearchParser, buildSearchRetrievalQuery } from "@/services/search/search-parser";

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
    expect(q.maxPriceCents).toBeNull();
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

  it("parses chicken curry under ₹300 near me", () => {
    const q = parser.parse("Best chicken curry under ₹300 near me");
    const summary = parser.summarize(q);
    expect(summary).toMatchObject({
      item: "chicken curry",
      category: "restaurant",
      location: "current",
      qualityPreference: "best",
      maxPriceCents: 30000,
    });
    expect(q.maxPriceCents).toBe(30000);
    expect(q.itemTerms[0]).toBe("chicken curry");
  });

  it("parses men's haircut under 500 open now", () => {
    const q = parser.parse("Men's haircut under 500 open now");
    expect(q.maxPriceCents).toBe(50000);
    expect(q.openNow).toBe(true);
    expect(q.categorySlugs).toContain("barbers");
    expect(q.serviceTerms.some((t) => t.includes("haircut"))).toBe(true);
  });

  it("parses black shirt for office under 1500", () => {
    const q = parser.parse("Black shirt for office under 1500");
    const summary = parser.summarize(q);
    expect(q.maxPriceCents).toBe(150000);
    expect(q.categorySlugs).toContain("clothing-fashion");
    expect(q.attributes).toContain("office");
    expect(q.itemTerms[0]).toBe("black shirt");
    expect(summary.category).toBe("clothing");
  });

  it("maps perfume in Wagholi to beauty discovery, not a leftover item query", () => {
    const q = parser.parse("Perfume in Wagholi");
    const summary = parser.summarize(q);
    expect(q.categorySlugs).toContain("beauty-personal-care");
    expect(q.location).toMatchObject({ mode: "named", areaSlug: "wagholi" });
    expect(q.itemTerms).toEqual([]);
    expect(q.freeTextTokens).toEqual([]);
    expect(buildSearchRetrievalQuery(q)).toBe("");
    expect(summary).toMatchObject({
      item: null,
      category: "beauty",
      location: "Wagholi",
      intent: "discovery",
    });
  });
});
