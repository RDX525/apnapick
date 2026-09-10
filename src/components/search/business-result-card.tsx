import { memo } from "react";
import Link from "next/link";
import { MapPin, MessageCircle, Navigation, Phone, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerifiedBadge, ClaimedBadge } from "@/components/trust/verified-badge";
import { formatDistance } from "@/lib/geo/distance";
import { formatInrFromCents } from "@/lib/money/inr";
import {
  mapsSearchDirectionsUrl,
  telHref,
  whatsappHref,
} from "@/lib/contact/phone";
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
  city?: string | null;
  categoryLabel?: string | null;
  matchedItem?: string | null;
  matchedItemPriceCents?: number | null;
  phone?: string | null;
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
    city: result.city,
    categoryLabel: result.categories?.[0] ?? null,
    matchedItem: result.matchedItemName,
    matchedItemPriceCents: result.matchedItemPriceCents,
    phone: result.phone,
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
    city: card.city,
    categoryLabel: card.categoryLabel,
    matchedItem: card.matchedItem,
    matchedItemPriceCents: card.matchedItemPriceCents,
    phone: card.phone,
    priceLevel: card.priceLevel,
    openNow: card.openNow,
    isVerified: Boolean(card.isVerified),
    isClaimed: card.isClaimed,
    coverImageUrl: card.coverImageUrl,
    categorySlugs: card.categorySlugs,
  };
}

function directionsHref(model: CardModel): string {
  const destination = [model.name, model.suburb, model.city ?? "Pune"]
    .filter(Boolean)
    .join(", ");
  return mapsSearchDirectionsUrl(destination);
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
  const wa = model.phone
    ? whatsappHref(model.phone, `Hi, I found ${model.name} on ApnaPick`)
    : null;
  const callHref = model.phone ? telHref(model.phone) : null;
  const rupeePrice =
    model.matchedItemPriceCents != null
      ? formatInrFromCents(model.matchedItemPriceCents)
      : null;

  return (
    <article
      className={cn(
        "ap-surface group hover:ring-sea/25 relative grid grid-cols-[6.75rem_minmax(0,1fr)] overflow-hidden rounded-[1.35rem] transition duration-300 hover:ring-1 sm:grid-cols-[140px_1fr] sm:rounded-2xl [@media(hover:hover)]:hover:-translate-y-0.5",
        selected && "ring-sea/40 ring-1",
        className,
      )}
      onMouseEnter={onSelect}
      onFocusCapture={onSelect}
    >
      <div className="ap-media-gradient relative min-h-full overflow-hidden">
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

      <div className="flex min-w-0 flex-col gap-2 p-3 sm:gap-3 sm:p-5">
        <div className="min-w-0 space-y-1 sm:space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <h2 className="font-display text-ink text-lg tracking-tight sm:text-xl">
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
            <p className="text-muted-foreground line-clamp-1 text-sm sm:line-clamp-2">
              {model.description}
            </p>
          ) : null}
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {rupeePrice ? (
            <span className="text-foreground font-semibold">{rupeePrice}</span>
          ) : model.priceLevel ? (
            <span aria-label={`Price level ${model.priceLevel}`}>
              {"₹".repeat(model.priceLevel)}
            </span>
          ) : null}
          <span className="text-foreground inline-flex items-center gap-1">
            <Star className="fill-accent text-accent size-3.5" aria-hidden />
            <span>{model.avgRating > 0 ? model.avgRating.toFixed(1) : "New"}</span>
            <span className="text-muted-foreground">({model.reviewCount})</span>
          </span>
          {model.suburb ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {model.suburb}
            </span>
          ) : model.categoryLabel ? (
            <span>{model.categoryLabel}</span>
          ) : null}
          {model.distanceM != null ? (
            <span>{formatDistance(model.distanceM)}</span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {wa ? (
            <Button asChild size="sm" className="min-h-10 sm:min-h-11">
              <a href={wa} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp
              </a>
            </Button>
          ) : null}
          {callHref ? (
            <Button asChild size="sm" variant={wa ? "outline" : "default"} className="min-h-10 sm:min-h-11">
              <a href={callHref}>
                <Phone className="size-4" aria-hidden />
                Call
              </a>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="outline" className="min-h-10 sm:min-h-11">
            <a href={directionsHref(model)} target="_blank" rel="noopener noreferrer">
              <Navigation className="size-4" aria-hidden />
              Directions
            </a>
          </Button>
          <Button asChild size="sm" variant="ghost" className="hidden min-h-11 sm:inline-flex">
            <Link href={`/b/${model.slug}`}>View</Link>
          </Button>
        </div>
      </div>
    </article>
  );
});
