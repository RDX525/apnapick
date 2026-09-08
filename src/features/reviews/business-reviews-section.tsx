"use client";

import { useCallback, useState, useTransition } from "react";
import { RatingSummaryPanel } from "@/components/trust/rating-summary";
import { ReviewCard, ReviewComposer } from "@/features/reviews/review-composer";
import type { PublicReview, RatingSummary } from "@/domain/reviews/types";
import { emptyDistribution } from "@/services/reviews/aggregation";

type Bundle = {
  summary: RatingSummary;
  reviews: PublicReview[];
  ownReview: PublicReview | null;
};

export function BusinessReviewsSection({
  businessId,
  businessSlug,
  initialSummary,
  initialReviews,
  initialOwnReview,
  signedIn,
  canReply = false,
}: {
  businessId: string;
  businessSlug: string;
  initialSummary: RatingSummary;
  initialReviews: PublicReview[];
  initialOwnReview: PublicReview | null;
  signedIn: boolean;
  canReply?: boolean;
}) {
  const [bundle, setBundle] = useState<Bundle>({
    summary: initialSummary,
    reviews: initialReviews,
    ownReview: initialOwnReview,
  });
  const [, startTransition] = useTransition();

  const refresh = useCallback(
    (signal?: AbortSignal) => {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/reviews?businessId=${businessId}`, { signal });
          if (!res.ok) return;
          const json = (await res.json()) as { data: Bundle };
          setBundle(json.data);
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      });
    },
    [businessId],
  );

  return (
    <section aria-labelledby="reviews-heading" className="space-y-6">
      <div>
        <h2 id="reviews-heading" className="font-display text-ink text-2xl">
          Reviews
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Ratings are aggregated server-side from published reviews only.
        </p>
      </div>

      <RatingSummaryPanel summary={bundle.summary} />

      <ReviewComposer
        key={bundle.ownReview?.id ?? "new-review"}
        businessId={businessId}
        loginNext={`/b/${businessSlug}`}
        existing={bundle.ownReview}
        signedIn={signedIn}
        onSaved={({ review, summary }) => {
          setBundle((prev) => ({
            summary,
            ownReview: review,
            reviews:
              review.status === "PUBLISHED"
                ? [
                    { ...review, isOwn: true },
                    ...prev.reviews.filter((r) => r.id !== review.id),
                  ]
                : prev.reviews.filter((r) => r.id !== review.id),
          }));
        }}
      />

      <ul className="space-y-4">
        {bundle.reviews.length === 0 ? (
          <li className="border-border/80 text-muted-foreground rounded-2xl border border-dashed px-5 py-8 text-center text-sm">
            Be the first to review this place.
          </li>
        ) : (
          bundle.reviews.map((review) => (
            <li key={review.id}>
              <ReviewCard review={review} canReply={canReply} onChanged={refresh} />
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

export function summaryFromDenorm(average: number, count: number): RatingSummary {
  return {
    average,
    count,
    distribution: emptyDistribution(),
  };
}
