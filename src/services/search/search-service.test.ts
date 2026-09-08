import { describe, expect, it } from "vitest";
import { SearchService } from "@/services/search/search-service";
import { InMemorySearchRepository } from "@/repositories/search/search-repository";
import { RankingService } from "@/services/search/ranking-service";
import { DEFAULT_RANKING_WEIGHTS } from "@/domain/ranking/weights";
import type { SearchEngine } from "@/domain/search/search-engine";

describe("SearchService integration (demo catalog)", () => {
  const service = new SearchService(new InMemorySearchRepository());

  it("returns chicken curry matches near Pune CBD", async () => {
    const res = await service.search({
      query: "best chicken curry near me",
      location: { lat: 18.5204, lng: 73.8567, radiusM: 15000 },
    });
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.intent).toMatchObject({
      item: "chicken curry",
      category: "restaurant",
      location: "current",
      intent: "discovery",
      qualityPreference: "best",
    });
    expect(
      res.results.some((r) => (r.matchedItemName ?? "").toLowerCase().includes("curry")),
    ).toBe(true);
    expect(res.query.qualityPreference).toBe("best");
  });

  it("finds barbers for fade", async () => {
    const res = await service.search({
      query: "best barber for fade near me",
      location: { lat: 18.5204, lng: 73.8567, radiusM: 20000 },
    });
    expect(res.results.some((r) => r.slug === "fade-room-barbers")).toBe(true);
  });

  it("supports filters and distance sort without inventing rating-only order", async () => {
    const res = await service.search({
      query: "best chicken curry near me",
      location: { lat: 18.5204, lng: 73.8567, radiusM: 20000 },
      filters: { openNow: true, minRating: 4 },
      sort: "distance",
    });
    expect(res.results.every((r) => r.openNow !== false)).toBe(true);
    for (let i = 1; i < res.results.length; i++) {
      const prev = res.results[i - 1]!.distanceM ?? Infinity;
      const next = res.results[i]!.distanceM ?? Infinity;
      expect(prev).toBeLessThanOrEqual(next);
    }
  });

  it("paginates organic results and preserves the filtered total", async () => {
    const first = await service.search({
      query: "restaurant near me",
      location: { lat: 18.5204, lng: 73.8567, radiusM: 50000 },
      page: 1,
      pageSize: 1,
    });
    const second = await service.search({
      query: "restaurant near me",
      location: { lat: 18.5204, lng: 73.8567, radiusM: 50000 },
      page: 2,
      pageSize: 1,
    });

    expect(first.page).toBe(1);
    expect(first.pageSize).toBe(1);
    expect(first.total).toBeGreaterThan(1);
    expect(second.results[0]?.businessId).not.toBe(first.results[0]?.businessId);
  });

  it("supports verified-only discovery without changing organic ranking", async () => {
    const base = new InMemorySearchRepository();
    const verifiedEngine: SearchEngine = {
      name: "verified-test",
      async retrieve(query, context) {
        const candidates = await base.retrieve(query, context);
        return candidates.map((candidate, index) => ({
          ...candidate,
          isVerified: index === 0,
        }));
      },
    };
    const verifiedService = new SearchService(verifiedEngine);
    const res = await verifiedService.search({
      query: "restaurant near me",
      location: { lat: 18.5204, lng: 73.8567, radiusM: 50000 },
      filters: { verifiedOnly: true },
    });

    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results.every((result) => result.isVerified)).toBe(true);
  });
});

describe("Ranking weights", () => {
  it("exposes configurable weights without paid fields", () => {
    const ranking = new RankingService(DEFAULT_RANKING_WEIGHTS);
    const weights = ranking.getWeights();
    expect(weights.queryRelevance).toBeGreaterThan(weights.rating);
    expect(Object.keys(weights)).not.toContain("paid");
  });
});
