"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Flag, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { RatingStars } from "@/components/trust/rating-summary";
import type { PublicReview, RatingSummary } from "@/domain/reviews/types";
import { cn } from "@/lib/utils";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: T;
    error?: string;
    code?: string;
    details?: unknown;
  };
  if (!res.ok) {
    const err = new Error(json.error ?? "Request failed") as Error & {
      code?: string;
      details?: unknown;
      status?: number;
    };
    err.code = json.code;
    err.details = json.details;
    err.status = res.status;
    throw err;
  }
  return json.data as T;
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Rating</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="relative cursor-pointer">
            <input
              type="radio"
              name="review-rating"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "peer-focus-visible:ring-ring grid size-11 place-items-center rounded-lg transition peer-focus-visible:ring-2",
                value >= n ? "text-accent" : "text-border",
              )}
            >
              <span className="sr-only">{n} stars</span>
              <svg
                viewBox="0 0 24 24"
                className={cn(
                  "size-7",
                  value >= n ? "fill-accent" : "fill-transparent stroke-current",
                )}
                aria-hidden
              >
                <path
                  strokeWidth={1.5}
                  d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8L3.5 9.7l5.9-.9L12 3.5z"
                />
              </svg>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ReviewComposer({
  businessId,
  loginNext,
  existing,
  signedIn,
  viewerEmail,
  viewerDisplayName,
  onIdentitySaved,
  onSaved,
}: {
  businessId: string;
  loginNext: string;
  existing: PublicReview | null;
  signedIn: boolean;
  viewerEmail?: string | null;
  viewerDisplayName?: string | null;
  onIdentitySaved?: (displayName: string) => void;
  onSaved: (payload: { review: PublicReview; summary: RatingSummary }) => void;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [displayName, setDisplayName] = useState(viewerDisplayName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const needsPublicName = !(viewerDisplayName ?? "").trim();

  useEffect(() => {
    setDisplayName(viewerDisplayName ?? "");
  }, [viewerDisplayName]);

  if (!signedIn) {
    return (
      <div className="border-border/80 bg-card/60 rounded-2xl border border-dashed px-5 py-6 text-center">
        <p className="text-ink font-medium">Share your experience</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Sign in to rate and review. One review per business.
        </p>
        <Button asChild className="mt-4 min-h-10">
          <Link
            href={`/login?next=${encodeURIComponent(loginNext)}&intent=review`}
          >
            Sign in to review
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      className="border-border/70 bg-card space-y-4 rounded-2xl border p-5 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            const payload = {
              rating,
              title,
              body,
              displayName: displayName.trim() || null,
            };
            if (needsPublicName && !displayName.trim()) {
              setError(
                "Add a public name so others know who wrote the review. Your email stays private.",
              );
              return;
            }
            if (existing) {
              const data = await api<{
                review: PublicReview;
                summary: RatingSummary;
              }>(`/api/reviews/${existing.id}`, {
                method: "PATCH",
                body: JSON.stringify(payload),
              });
              if (data.review.authorName) onIdentitySaved?.(data.review.authorName);
              onSaved(data);
            } else {
              try {
                const data = await api<{
                  review: PublicReview;
                  summary: RatingSummary;
                }>("/api/reviews", {
                  method: "POST",
                  body: JSON.stringify({ businessId, ...payload }),
                });
                if (data.review.authorName) onIdentitySaved?.(data.review.authorName);
                onSaved(data);
              } catch (err) {
                const typed = err as Error & {
                  code?: string;
                  details?: { review?: PublicReview };
                };
                if (typed.code === "DUPLICATE_REVIEW" && typed.details?.review) {
                  onSaved({
                    review: typed.details.review,
                    summary: {
                      average: 0,
                      count: 0,
                      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                    },
                  });
                  setRating(typed.details.review.rating);
                  setTitle(typed.details.review.title ?? "");
                  setBody(typed.details.review.body ?? "");
                  setError(
                    "You already have a review for this business — update it below.",
                  );
                  return;
                }
                throw err;
              }
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save");
          }
        });
      }}
    >
      <div>
        <p className="text-sm font-medium">
          {existing ? "Edit your review" : "Write a review"}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Share specific, respectful feedback from your genuine experience.
        </p>
        {viewerEmail ? (
          <p className="text-muted-foreground mt-2 text-xs">
            Signed in as <span className="text-ink font-medium">{viewerEmail}</span>
            {viewerDisplayName?.trim() ? (
              <>
                {" · "}
                Appears publicly as{" "}
                <span className="text-ink font-medium">{viewerDisplayName.trim()}</span>
              </>
            ) : (
              <> · Your email stays private on the public review.</>
            )}
          </p>
        ) : null}
      </div>
      <StarPicker value={rating} onChange={setRating} />
      {needsPublicName ? (
        <div className="space-y-1">
          <Label htmlFor="review-display-name">Public name (required)</Label>
          <Input
            id="review-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How your name appears on this review"
            maxLength={80}
            className="min-h-10"
            required
            autoComplete="nickname"
          />
          <p className="text-muted-foreground text-xs">
            Shown on your review instead of your email.
          </p>
        </div>
      ) : null}
      <Label htmlFor="review-title">Review title (optional)</Label>
      <Input
        id="review-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        maxLength={120}
        className="min-h-10"
      />
      <Label htmlFor="review-body">Your review</Label>
      <Textarea
        id="review-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What stood out — dishes, service, ambience…"
        rows={4}
        maxLength={4000}
      />
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="min-h-10">
        {pending ? "Saving…" : existing ? "Update review" : "Post review"}
      </Button>
      {existing?.status === "PENDING" ? (
        <Badge variant="outline">
          {existing.verificationRequested
            ? "Verification requested — update your review to continue"
            : "Pending moderation — only you can see this until it’s approved"}
        </Badge>
      ) : null}
    </form>
  );
}

export function ReviewCard({
  review,
  canReply,
  onChanged,
}: {
  review: PublicReview;
  canReply?: boolean;
  onChanged?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [reply, setReply] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <article className="border-border/70 bg-card rounded-2xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <RatingStars value={review.rating} size="sm" />
            <span className="text-sm font-medium">
              {review.authorName?.trim() || "ApnaPick member"}
            </span>
            {review.isOwn ? <Badge variant="outline">You</Badge> : null}
            {review.isOwn && review.status === "PENDING" ? (
              <Badge variant="outline">Pending moderation</Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {new Date(review.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {review.isOwn ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditing((v) => !v)}
              >
                <Pencil className="size-3.5" aria-hidden />
                Edit
              </Button>
              <ConfirmationDialog
                disabled={pending}
                title="Delete your review permanently?"
                description="This permanently removes your rating and review from this business. You can write a new review later if you change your mind."
                confirmLabel="Delete permanently"
                onConfirm={async () => {
                  await api(`/api/reviews/${review.id}`, {
                    method: "DELETE",
                  });
                  onChanged?.();
                }}
                trigger={
                  <Button type="button" size="sm" variant="ghost">
                    <Trash2 className="size-3.5" aria-hidden />
                    Delete
                  </Button>
                }
              />
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setReporting((v) => !v)}
            >
              <Flag className="size-3.5" aria-hidden />
              Report
            </Button>
          )}
        </div>
      </div>

      {review.title ? (
        <h3 className="text-ink mt-3 font-medium">{review.title}</h3>
      ) : null}
      {review.body ? (
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          {review.body}
        </p>
      ) : null}

      {review.replyBody ? (
        <div className="border-sea/20 bg-sea/5 mt-4 rounded-xl border px-4 py-3">
          <p className="text-sea text-xs font-medium tracking-wide uppercase">
            Owner response
          </p>
          <p className="text-foreground mt-1 text-sm">{review.replyBody}</p>
        </div>
      ) : null}

      {editing && review.isOwn ? (
        <div className="mt-4">
          <ReviewComposer
            businessId={review.businessId}
            loginNext={`/b/${review.businessId}`}
            existing={review}
            signedIn
            onSaved={() => {
              setEditing(false);
              onChanged?.();
            }}
          />
        </div>
      ) : null}

      {reporting ? (
        <form
          className="bg-mist/70 mt-4 space-y-2 rounded-xl p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await api(`/api/reviews/${review.id}/report`, {
                  method: "POST",
                  body: JSON.stringify({
                    reason: reportReason,
                    details: form.get("details"),
                  }),
                });
                setReporting(false);
                setError(null);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Report failed");
              }
            });
          }}
        >
          <Label htmlFor={`report-reason-${review.id}`}>Reason</Label>
          <Select value={reportReason} onValueChange={setReportReason}>
            <SelectTrigger id={`report-reason-${review.id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="spam">Spam</SelectItem>
              <SelectItem value="abuse">Abuse</SelectItem>
              <SelectItem value="fake">Fake / misleading</SelectItem>
              <SelectItem value="off_topic">Off topic</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Label htmlFor={`report-details-${review.id}`}>Details (optional)</Label>
          <Textarea
            id={`report-details-${review.id}`}
            name="details"
            rows={2}
            placeholder="Optional details"
            maxLength={1000}
          />
          <Button type="submit" size="sm" disabled={pending}>
            Submit report
          </Button>
        </form>
      ) : null}

      {canReply && !review.replyBody ? (
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              try {
                await api(`/api/reviews/${review.id}/reply`, {
                  method: "POST",
                  body: JSON.stringify({ replyBody: reply }),
                });
                setReply("");
                onChanged?.();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Reply failed");
              }
            });
          }}
        >
          <Label htmlFor={`owner-reply-${review.id}`}>Business response</Label>
          <Textarea
            id={`owner-reply-${review.id}`}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Respond as the business owner…"
            rows={2}
            maxLength={2000}
          />
          <Button type="submit" size="sm" disabled={pending || !reply.trim()}>
            Post response
          </Button>
        </form>
      ) : null}

      {error ? (
        <p role="alert" className="text-destructive mt-2 text-sm">
          {error}
        </p>
      ) : null}
    </article>
  );
}
