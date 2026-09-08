import type {
  PublicReview,
  RatingDistribution,
  RatingSummary,
} from "@/domain/reviews/types";

export function emptyDistribution(): RatingDistribution {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

/**
 * Server-controlled rating aggregation.
 * Only published, non-deleted reviews contribute.
 * Clients must never invent averages or manipulate counts.
 */
export function aggregateRatings(ratings: readonly number[]): RatingSummary {
  const distribution = emptyDistribution();
  let sum = 0;
  for (const rating of ratings) {
    if (rating < 1 || rating > 5) continue;
    const key = rating as 1 | 2 | 3 | 4 | 5;
    distribution[key] += 1;
    sum += rating;
  }
  const count = Object.values(distribution).reduce((a, b) => a + b, 0);
  const average = count === 0 ? 0 : Math.round((sum / count) * 100) / 100;
  return { average, count, distribution };
}

export function aggregateFromReviews(
  reviews: readonly Pick<PublicReview, "rating" | "status">[],
): RatingSummary {
  return aggregateRatings(
    reviews.filter((r) => r.status === "PUBLISHED").map((r) => r.rating),
  );
}

/** Payment must never influence organic review ranking. */
export function sortReviewsForDisplay(reviews: PublicReview[]): PublicReview[] {
  return [...reviews].sort((a, b) => {
    const t = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (t !== 0) return t;
    return b.rating - a.rating;
  });
}
