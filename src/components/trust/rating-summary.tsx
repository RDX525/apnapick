import { Star } from "lucide-react";
import type { RatingSummary } from "@/domain/reviews/types";
import { cn } from "@/lib/utils";

export function RatingStars({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const dim = size === "sm" ? "size-3.5" : "size-4";
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${value.toFixed(1)} out of 5`}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i + 1 <= Math.round(value);
        return (
          <Star
            key={i}
            className={cn(dim, filled ? "fill-accent text-accent" : "text-border")}
            aria-hidden
          />
        );
      })}
    </span>
  );
}

export function RatingSummaryPanel({
  summary,
  className,
}: {
  summary: RatingSummary;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ap-media-gradient-soft border-border/70 overflow-hidden rounded-2xl border",
        className,
      )}
    >
      <div className="grid gap-6 p-5 sm:grid-cols-[140px_1fr] sm:p-6">
        <div className="flex flex-col items-start justify-center">
          <p className="font-display text-ink text-5xl tracking-tight">
            {summary.count > 0 ? summary.average.toFixed(1) : "—"}
          </p>
          <RatingStars value={summary.average} className="mt-2" />
          <p className="text-muted-foreground mt-2 text-sm">
            {summary.count === 0
              ? "No reviews yet"
              : `${summary.count} review${summary.count === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="space-y-2" aria-label="Rating distribution">
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const count = summary.distribution[star];
            const pct = summary.count === 0 ? 0 : (count / summary.count) * 100;
            return (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground w-8 tabular-nums">{star}★</span>
                <div className="bg-secondary h-2 flex-1 overflow-hidden rounded-full">
                  <div
                    role="progressbar"
                    aria-label={`${star} star reviews`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(pct)}
                    className="bg-accent h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-muted-foreground w-8 text-right tabular-nums">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
