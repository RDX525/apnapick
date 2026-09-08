"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/states/empty-state";
import { StatusBadge } from "@/components/operations/status-badge";
import { Label } from "@/components/ui/label";
import { useDashboard } from "@/features/dashboard/dashboard-provider";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export function ReviewsManagerPage() {
  const { workspace, update } = useDashboard();
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <DashboardShell
      activePath="/business/dashboard/reviews"
      title="Reviews"
      description="Respond to customers. Hide abuse when needed — replies and moderation are audited."
    >
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <ul className="space-y-3">
        {workspace.reviews.length === 0 ? (
          <li>
            <EmptyState
              compact
              title="No reviews yet"
              description="Published customer reviews will appear here."
            />
          </li>
        ) : (
          workspace.reviews.map((review) => (
            <li
              key={review.id}
              className="border-border/70 bg-card rounded-2xl border p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Star className="fill-accent text-accent size-4" aria-hidden />
                  {review.rating}
                  <span className="text-muted-foreground">{review.authorName}</span>
                  <StatusBadge status={review.status} />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    update((w) => ({
                      ...w,
                      reviews: w.reviews.map((r) =>
                        r.id === review.id
                          ? {
                              ...r,
                              status: r.status === "HIDDEN" ? "PUBLISHED" : "HIDDEN",
                            }
                          : r,
                      ),
                    }))
                  }
                >
                  {review.status === "HIDDEN" ? "Unhide" : "Hide"}
                </Button>
              </div>
              {review.title ? <p className="mt-2 font-medium">{review.title}</p> : null}
              {review.body ? (
                <p className="text-muted-foreground mt-1 text-sm">{review.body}</p>
              ) : null}

              <div className="mt-4 space-y-2">
                <Label htmlFor={`review-reply-${review.id}`}>Owner response</Label>
                <Textarea
                  id={`review-reply-${review.id}`}
                  value={replyDraft[review.id] ?? ""}
                  onChange={(e) =>
                    setReplyDraft((d) => ({
                      ...d,
                      [review.id]: e.target.value,
                    }))
                  }
                  placeholder="Owner response…"
                  rows={2}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={pending || !(replyDraft[review.id] ?? "").trim()}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      try {
                        const res = await fetch(`/api/reviews/${review.id}/reply`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            replyBody: replyDraft[review.id],
                          }),
                        });
                        const json = (await res.json()) as { error?: string };
                        if (!res.ok) {
                          throw new Error(json.error ?? "Reply failed");
                        }
                        setReplyDraft((d) => ({ ...d, [review.id]: "" }));
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Reply failed");
                      }
                    });
                  }}
                >
                  Post response
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>
    </DashboardShell>
  );
}
