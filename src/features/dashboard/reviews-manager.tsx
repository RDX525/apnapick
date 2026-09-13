"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/states/empty-state";
import { StatusBadge } from "@/components/operations/status-badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboard } from "@/features/dashboard/dashboard-provider";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "abuse", label: "Abuse / harassment" },
  { value: "fake", label: "Fake or misleading" },
  { value: "off_topic", label: "Off topic" },
  { value: "other", label: "Other" },
] as const;

export function ReviewsManagerPage() {
  const { workspace } = useDashboard();
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [reportReason, setReportReason] = useState<Record<string, string>>({});
  const [reported, setReported] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  return (
    <DashboardShell
      activePath="/business/dashboard/reviews"
      title="Reviews"
      description="Respond to customers. Businesses cannot hide or delete reviews — only ApnaPick moderation can remove a review based on policy."
    >
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      {info ? (
        <p role="status" className="text-muted-foreground text-sm">
          {info}
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
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Star className="fill-accent text-accent size-4" aria-hidden />
                {review.rating}
                <span className="text-muted-foreground">{review.authorName}</span>
                <StatusBadge status={review.status} />
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
                    setInfo(null);
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
                        setInfo("Response posted.");
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Reply failed");
                      }
                    });
                  }}
                >
                  Post response
                </Button>
              </div>

              <div className="border-border/60 mt-4 space-y-2 border-t pt-4">
                <p className="text-muted-foreground text-xs">
                  Think this review breaks ApnaPick policy? Report it for moderation — you
                  cannot remove it yourself.
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[12rem] flex-1 space-y-1">
                    <Label htmlFor={`review-report-${review.id}`}>Report reason</Label>
                    <Select
                      value={reportReason[review.id] ?? "fake"}
                      onValueChange={(value) =>
                        setReportReason((d) => ({ ...d, [review.id]: value }))
                      }
                      disabled={reported[review.id]}
                    >
                      <SelectTrigger id={`review-report-${review.id}`}>
                        <SelectValue placeholder="Reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {REPORT_REASONS.map((reason) => (
                          <SelectItem key={reason.value} value={reason.value}>
                            {reason.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending || reported[review.id]}
                    onClick={() => {
                      setError(null);
                      setInfo(null);
                      startTransition(async () => {
                        try {
                          const res = await fetch(`/api/reviews/${review.id}/report`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              reason: reportReason[review.id] ?? "fake",
                              details:
                                "Reported by business owner from dashboard reviews.",
                            }),
                          });
                          const json = (await res.json()) as { error?: string };
                          if (!res.ok) {
                            throw new Error(json.error ?? "Report failed");
                          }
                          setReported((d) => ({ ...d, [review.id]: true }));
                          setInfo(
                            "Report submitted. ApnaPick moderation will review it.",
                          );
                        } catch (err) {
                          setError(
                            err instanceof Error ? err.message : "Report failed",
                          );
                        }
                      });
                    }}
                  >
                    {reported[review.id] ? "Reported" : "Report to ApnaPick"}
                  </Button>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </DashboardShell>
  );
}
