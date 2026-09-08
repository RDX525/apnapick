import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SponsoredResult } from "@/domain/billing/types";
import { cn } from "@/lib/utils";

/**
 * Clearly labeled paid placement — never mixed into organic ranking scores.
 */
export function SponsoredResultCard({
  result,
  className,
}: {
  result: SponsoredResult;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "border-accent/35 bg-accent/8 rounded-2xl border border-dashed p-4 sm:p-5",
        className,
      )}
      data-sponsored="true"
      aria-label={`${result.label}: ${result.name}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className="border-accent/40 bg-accent/15 text-accent font-medium"
        >
          {result.label || "Sponsored"}
        </Badge>
        <span className="text-muted-foreground text-xs">
          Paid placement · not ranked by relevance
        </span>
      </div>
      <h2 className="font-display text-ink text-xl tracking-tight">
        <Link
          href={`/b/${result.slug}`}
          className="hover:text-sea focus-visible:ring-ring rounded-sm outline-none focus-visible:ring-2"
        >
          {result.name}
        </Link>
      </h2>
      <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-foreground inline-flex items-center gap-1">
          <Star className="fill-accent text-accent size-3.5" aria-hidden />
          {result.avgRating > 0 ? result.avgRating.toFixed(1) : "New"}
          <span className="text-muted-foreground">({result.reviewCount})</span>
        </span>
        {result.suburb ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden />
            {result.suburb}
          </span>
        ) : null}
      </div>
    </article>
  );
}
