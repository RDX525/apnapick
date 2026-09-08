import { memo } from "react";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerifiedBadge, ClaimedBadge } from "@/components/trust/verified-badge";
import { formatDistance } from "@/lib/geo/distance";
import { cn } from "@/lib/utils";
import type { RankedSearchResult } from "@/domain/search/types";
import type { ConsumerBusinessCard } from "@/domain/consumer/types";
import { BusinessImage } from "@/components/media/business-image";
import { CoverPhoto } from "@/components/media/cover-photo";
import { categoryCover } from "@/config/visual-media";
import { pickImageSrc } from "@/lib/media/photo-url";

type CardModel = {
  slug: string;
  name: string;
  description?: string | null;
  avgRating: number;
  reviewCount: number;
  distanceM?: number | null;
  suburb?: string | null;
  categoryLabel?: string | null;
  matchedItem?: string | null;
  priceLevel?: number | null;
  openNow?: boolean | null;
  isVerified?: boolean;
  isClaimed?: boolean;
  coverImageUrl?: string | null;
  categorySlugs?: string[];
};

function fromSearchResult(result: RankedSearchResult): CardModel {
  return {
    slug: result.slug,
    name: result.name,
    description: result.description,
    avgRating: result.avgRating,
    reviewCount: result.reviewCount,
    distanceM: result.distanceM,
    suburb: result.suburb,
    categoryLabel: result.categories?.[0] ?? null,
    matchedItem: result.matchedItemName,
    priceLevel: result.priceLevel,
    openNow: result.openNow,
    isVerified: Boolean(result.isVerified),
    isClaimed: result.isClaimed,
    coverImageUrl: result.imageUrl,
    categorySlugs: result.categories,
  };
}

function fromConsumerCard(card: ConsumerBusinessCard): CardModel {
  return {
    slug: card.slug,
    name: card.name,
    description: card.description,
    avgRating: card.avgRating,
    reviewCount: card.reviewCount,
    distanceM: card.distanceM,
    suburb: card.suburb,
    categoryLabel: card.categoryLabel,
    matchedItem: card.matchedItem,
    priceLevel: card.priceLevel,
    openNow: card.openNow,
    isVerified: Boolean(card.isVerified),
    isClaimed: card.isClaimed,
    coverImageUrl: card.coverImageUrl,
    categorySlugs: card.categorySlugs,
  };
}

type Props = {
  result?: RankedSearchResult;
  business?: ConsumerBusinessCard;
  className?: string;
  priority?: boolean;
  selected?: boolean;
  onSelect?: () => void;
};

export const BusinessResultCard = memo(function BusinessResultCard({
  result,
  business,
  className,
  priority = false,
  selected,
  onSelect,
}: Props) {
  const model = result
    ? fromSearchResult(result)
    : business
      ? fromConsumerCard(business)
      : null;
  if (!model) return null;

  const imageSrc = pickImageSrc(
    model.coverImageUrl,
    categoryCover(model.categorySlugs?.[0], model.categoryLabel),
  );
  const remoteImage = imageSrc.startsWith("http") || imageSrc.includes("/storage/v1/");

  return (
    <article
      className={cn(
        "ap-surface group hover:ring-sea/25 relative grid overflow-hidden rounded-2xl transition duration-300 hover:ring-1 sm:grid-cols-[140px_1fr] [@media(hover:hover)]:hover:-translate-y-0.5",
        selected && "ring-sea/40 ring-1",
        className,
      )}
      onMouseEnter={onSelect}
      onFocusCapture={onSelect}
    >
      <div className="ap-media-gradient relative min-h-32 overflow-hidden sm:min-h-full">
        {remoteImage ? (
          <BusinessImage
            src={imageSrc}
            alt=""
            fill
            sizes="(max-width: 639px) 100vw, 140px"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <CoverPhoto
            src={imageSrc}
            alt=""
            sizes="(max-width: 639px) 100vw, 140px"
            priority={priority}
          />
        )}
      </div>

      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-ink text-xl tracking-tight">
                <Link
                  href={`/b/${model.slug}`}
                  className="hover:text-sea focus-visible:ring-ring rounded-sm outline-none focus-visible:ring-2"
                >
                  {model.name}
                </Link>
              </h2>
              <VerifiedBadge verified={Boolean(model.isVerified)} />
              <ClaimedBadge
                claimed={Boolean(model.isClaimed)}
                verified={Boolean(model.isVerified)}
              />
              {model.openNow === true ? (
                <Badge className="bg-sea/15 text-sea hover:bg-sea/15">Open</Badge>
              ) : model.openNow === false ? (
                <Badge variant="outline">Closed</Badge>
              ) : null}
            </div>

            {model.matchedItem ? (
              <p className="text-sea text-sm">
                Matches <span className="font-medium">{model.matchedItem}</span>
              </p>
            ) : null}

            {model.description ? (
              <p className="text-muted-foreground line-clamp-2 text-sm">
                {model.description}
              </p>
            ) : null}
          </div>

          <Button asChild size="sm" className="min-h-11 shrink-0">
            <Link href={`/b/${model.slug}`}>View</Link>
          </Button>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="text-foreground inline-flex items-center gap-1">
            <Star className="fill-accent text-accent size-3.5" aria-hidden />
            <span>{model.avgRating > 0 ? model.avgRating.toFixed(1) : "New"}</span>
            <span className="text-muted-foreground">({model.reviewCount})</span>
          </span>
          {model.categoryLabel ? <span>{model.categoryLabel}</span> : null}
          {model.suburb ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {model.suburb}
            </span>
          ) : null}
          {model.distanceM != null ? (
            <span>{formatDistance(model.distanceM)}</span>
          ) : null}
          {model.priceLevel ? (
            <span aria-label={`Price level ${model.priceLevel}`}>
              {"₹".repeat(model.priceLevel)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
});
