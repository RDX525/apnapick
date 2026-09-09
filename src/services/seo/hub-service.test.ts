import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/repositories/seo/seo-repository", () => ({
  listBusinessesForSeoHub: vi.fn(async () => ({
    businesses: [],
    catalogItems: [],
    source: "empty" as const,
  })),
}));

describe("resolveSeoHub", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns null for unknown categories", async () => {
    const { resolveSeoHub } = await import("@/services/seo/hub-service");
    expect(await resolveSeoHub({ categorySlug: "spaceships" })).toBeNull();
  });

  it("returns null for unknown areas", async () => {
    const { resolveSeoHub } = await import("@/services/seo/hub-service");
    expect(
      await resolveSeoHub({
        categorySlug: "restaurants",
        areaSlug: "atlantis",
      }),
    ).toBeNull();
    expect(
      await resolveSeoHub({
        categorySlug: "restaurants",
        areaSlug: "baner",
      }),
    ).toBeNull();
  });

  it("builds a non-indexable empty category hub", async () => {
    const { resolveSeoHub } = await import("@/services/seo/hub-service");
    const hub = await resolveSeoHub({ categorySlug: "restaurants" });
    expect(hub).not.toBeNull();
    expect(hub!.indexable).toBe(false);
    expect(hub!.noIndexReason).toBe("empty_results");
    expect(hub!.path).toBe("/restaurants");
    expect(hub!.breadcrumbs[0]!.name).toBe("Home");
  });

  it("resolves deep dish hubs with unique titles", async () => {
    const { resolveSeoHub } = await import("@/services/seo/hub-service");
    const hub = await resolveSeoHub({
      categorySlug: "restaurants",
      areaSlug: "pune",
      facetSlug: "indian",
      itemSlug: "chicken-curry",
    });
    expect(hub?.h1).toMatch(/Chicken curry/i);
    expect(hub?.canonicalPath).toBe("/restaurants/pune/indian/chicken-curry");
    expect(hub?.indexable).toBe(false);
  });

  it("canonicalises north-indian to indian", async () => {
    const { resolveSeoHub } = await import("@/services/seo/hub-service");
    const hub = await resolveSeoHub({
      categorySlug: "restaurants",
      areaSlug: "pune",
      facetSlug: "north-indian",
    });
    expect(hub?.canonicalPath).toBe("/restaurants/pune/indian");
    expect(hub?.path).toBe("/restaurants/pune/north-indian");
  });
});
