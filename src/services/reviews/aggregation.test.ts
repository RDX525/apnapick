import { describe, expect, it } from "vitest";
import {
  assessReviewAbuse,
  reviewTextSimilarity,
} from "@/services/reviews/abuse";
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
    expect(result.holdForModeration).toBe(true);
    expect(result.flags.some((f) => /promotional|spam|link/i.test(f))).toBe(true);
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

  it("holds reviews with contact details", () => {
    const result = assessReviewAbuse({
      rating: 5,
      body: "Great food, WhatsApp me on 9876543210 for deals",
    });
    expect(result.signals).toContain("contains_contact_details");
    expect(result.holdForModeration).toBe(true);
  });

  it("detects similar wording against prior reviews", () => {
    const body =
      "Absolutely loved the paneer butter masala and the service was wonderful tonight.";
    const result = assessReviewAbuse({
      rating: 5,
      body,
      compareBodies: [
        "Absolutely loved the paneer butter masala and the service was wonderful tonight!",
      ],
    });
    expect(result.signals).toContain("similar_wording");
    expect(result.holdForModeration).toBe(true);
    expect(result.flags).toContain("Similar wording detected");
  });

  it("does not hold on related accounts alone (soft IP signal)", () => {
    const result = assessReviewAbuse({
      rating: 4,
      body: "Loved the misal pav and service was quick on a weekday evening.",
      relatedAccountCount: 2,
    });
    expect(result.signals).toContain("related_accounts");
    expect(result.holdForModeration).toBe(false);
    expect(result.flags).toContain("Multiple reviews from related accounts");
  });

  it("holds when related accounts combine with another signal", () => {
    const result = assessReviewAbuse({
      rating: 1,
      body: "Bad",
      relatedAccountCount: 1,
    });
    expect(result.signals).toContain("related_accounts");
    expect(result.signals).toContain("short_negative_body");
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
    expect(result.flags).toEqual([]);
  });

  it("scores review text similarity", () => {
    expect(
      reviewTextSimilarity(
        "The food was excellent and staff were friendly",
        "The food was excellent and staff were very friendly",
      ),
    ).toBeGreaterThan(0.8);
    expect(
      reviewTextSimilarity("Completely different sentence here", "Unrelated blah"),
    ).toBeLessThan(0.4);
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
