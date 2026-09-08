import { describe, expect, it } from "vitest";
import { assessReviewAbuse } from "@/services/reviews/abuse";
import {
  aggregateRatings,
  aggregateFromReviews,
  sortReviewsForDisplay,
} from "@/services/reviews/aggregation";

describe("review abuse detection", () => {
  it("flags promotional spam with URLs", () => {
    const result = assessReviewAbuse({
      rating: 5,
      body: "Amazing!!! Buy followers at https://spam.example",
    });
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.risk).not.toBe("low");
  });

  it("holds rapid posters for moderation", () => {
    const result = assessReviewAbuse({
      rating: 1,
      body: "Bad place overall experience",
      recentReviewCount24h: 6,
    });
    expect(result.signals).toContain("rapid_posting");
    expect(result.holdForModeration).toBe(true);
  });

  it("allows a normal review", () => {
    const result = assessReviewAbuse({
      rating: 4,
      title: "Great thali",
      body: "Loved the misal pav and service was quick on a weekday evening.",
    });
    expect(result.holdForModeration).toBe(false);
    expect(result.risk).toBe("low");
  });
});

describe("rating aggregation", () => {
  it("computes average and distribution server-side", () => {
    const summary = aggregateRatings([5, 5, 4, 3, 1]);
    expect(summary.count).toBe(5);
    expect(summary.average).toBe(3.6);
    expect(summary.distribution[5]).toBe(2);
    expect(summary.distribution[1]).toBe(1);
  });

  it("ignores non-published reviews", () => {
    const summary = aggregateFromReviews([
      { rating: 5, status: "PUBLISHED" },
      { rating: 1, status: "HIDDEN" },
      { rating: 4, status: "PENDING" },
    ]);
    expect(summary.count).toBe(1);
    expect(summary.average).toBe(5);
  });

  it("sorts newest first without payment influence", () => {
    const sorted = sortReviewsForDisplay([
      {
        id: "a",
        businessId: "b",
        userId: "u",
        rating: 3,
        title: null,
        body: null,
        status: "PUBLISHED",
        authorName: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        replyBody: null,
        repliedAt: null,
      },
      {
        id: "b",
        businessId: "b",
        userId: "u2",
        rating: 5,
        title: null,
        body: null,
        status: "PUBLISHED",
        authorName: null,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
        replyBody: null,
        repliedAt: null,
      },
    ]);
    expect(sorted[0]!.id).toBe("b");
  });
});
