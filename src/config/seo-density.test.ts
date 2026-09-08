import { describe, expect, it } from "vitest";
import {
  noIndexReasonForDensity,
  seoPageMeetsDensity,
  SEO_DENSITY,
} from "@/config/seo-density";
import {
  getSeoCategory,
  resolveFacetCanonical,
  isSeoCategorySlug,
} from "@/config/seo-taxonomy";

describe("seo density gates", () => {
  it("requires 8 businesses for category hubs", () => {
    expect(seoPageMeetsDensity("category", 7)).toBe(false);
    expect(seoPageMeetsDensity("category", 8)).toBe(true);
    expect(SEO_DENSITY.category).toBe(8);
  });

  it("requires 5 businesses for category × area", () => {
    expect(seoPageMeetsDensity("category_area", 4)).toBe(false);
    expect(seoPageMeetsDensity("category_area", 5)).toBe(true);
  });

  it("requires businesses and items for facets", () => {
    expect(seoPageMeetsDensity("category_area_facet", 3, 2)).toBe(false);
    expect(seoPageMeetsDensity("category_area_facet", 3, 3)).toBe(true);
    expect(seoPageMeetsDensity("category_area_facet_item", 2, 5)).toBe(false);
  });

  it("explains empty vs thin noindex reasons", () => {
    expect(noIndexReasonForDensity("category", 0)).toBe("empty_results");
    expect(noIndexReasonForDensity("category", 3)).toBe("insufficient_density");
    expect(noIndexReasonForDensity("category", 8)).toBeNull();
  });
});

describe("seo taxonomy", () => {
  it("includes restaurants, barbers, and services", () => {
    expect(isSeoCategorySlug("restaurants")).toBe(true);
    expect(isSeoCategorySlug("barbers")).toBe(true);
    expect(isSeoCategorySlug("services")).toBe(true);
    expect(isSeoCategorySlug("admin")).toBe(false);
  });

  it("canonicalises facet aliases", () => {
    const restaurants = getSeoCategory("restaurants")!;
    const indian = resolveFacetCanonical(restaurants, "north-indian");
    expect(indian?.slug).toBe("indian");
    expect(resolveFacetCanonical(restaurants, "indian")?.slug).toBe("indian");
  });

  it("supports plumber under services", () => {
    const services = getSeoCategory("services")!;
    expect(resolveFacetCanonical(services, "plumber")?.name).toBe("Plumber");
  });
});
