"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { RatingSummaryPanel } from "@/components/trust/rating-summary";
import { ReviewCard, ReviewComposer } from "@/features/reviews/review-composer";
import {
  loadBusinessViewer,
  type ReviewViewerIdentity,
} from "@/features/consumer/business-viewer";
import type { PublicReview, RatingSummary } from "@/domain/reviews/types";

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
  const [viewerSignedIn, setViewerSignedIn] = useState(signedIn);
  const [viewerCanReply, setViewerCanReply] = useState(canReply);
  const [viewer, setViewer] = useState<ReviewViewerIdentity | null>(null);
  const [, startTransition] = useTransition();

  const applyViewerMeta = useCallback(
    (data: {
      signedIn?: boolean;
      canReply?: boolean;
      viewer?: ReviewViewerIdentity | null;
    }) => {
      if (typeof data.signedIn === "boolean") setViewerSignedIn(data.signedIn);
      if (typeof data.canReply === "boolean") setViewerCanReply(data.canReply);
      if (data.viewer !== undefined) setViewer(data.viewer);
    },
    [],
  );

  const refresh = useCallback(
    (signal?: AbortSignal) => {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/reviews?businessId=${businessId}`, { signal });
          if (!res.ok) return;
          const json = (await res.json()) as {
            data: Bundle & {
              signedIn?: boolean;
              canReply?: boolean;
              viewer?: ReviewViewerIdentity | null;
            };
          };
          if (!json.data) return;
          setBundle({
            summary: json.data.summary,
            reviews: json.data.reviews,
            ownReview: json.data.ownReview,
          });
          applyViewerMeta(json.data);
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      });
    },
    [applyViewerMeta, businessId],
  );

  useEffect(() => {
    let cancelled = false;
    loadBusinessViewer(businessId).then((payload) => {
      if (cancelled || !payload) return;
      setBundle({
        summary: payload.summary,
        reviews: payload.reviews,
        ownReview: payload.ownReview,
      });
      setViewerSignedIn(payload.signedIn);
      setViewerCanReply(payload.canReply);
      setViewer(payload.viewer);
    });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

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
        signedIn={viewerSignedIn}
        viewerEmail={viewer?.email ?? null}
        viewerDisplayName={viewer?.displayName ?? null}
        onIdentitySaved={(displayName) =>
          setViewer((prev) => (prev ? { ...prev, displayName } : prev))
        }
        onSaved={({ review, summary }) => {
          setBundle((prev) => ({
            summary: summary.count > 0 || summary.average > 0 ? summary : prev.summary,
            ownReview: review,
            reviews: [
              { ...review, isOwn: true },
              ...prev.reviews.filter((r) => r.id !== review.id),
            ].filter((r) => r.status === "PUBLISHED" || r.isOwn),
          }));
          if (review.authorName) {
            setViewer((prev) =>
              prev ? { ...prev, displayName: review.authorName } : prev,
            );
          }
          refresh();
        }}
      />

      <ul className="space-y-4">
        {bundle.reviews.length === 0 && !bundle.ownReview ? (
          <li className="border-border/80 text-muted-foreground rounded-2xl border border-dashed px-5 py-8 text-center text-sm">
            Be the first to review this place.
          </li>
        ) : (
          bundle.reviews.map((review) => (
            <li key={review.id}>
              <ReviewCard review={review} canReply={viewerCanReply} onChanged={refresh} />
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
