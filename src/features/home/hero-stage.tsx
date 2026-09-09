import {
  BadgeCheck,
  Clock3,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { CoverPhoto } from "@/components/media/cover-photo";
import { BusinessImage } from "@/components/media/business-image";
import { categoryCover, MEDIA } from "@/config/visual-media";
import type { ConsumerBusinessCard } from "@/domain/consumer/types";
import { isUsableImageSrc, pickImageSrc } from "@/lib/media/photo-url";

function formatRating(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function HeroStage({ featured }: { featured?: ConsumerBusinessCard | null }) {
  const name = featured?.name ?? "A local favourite";
  const place =
    [featured?.categoryLabel, featured?.suburb ?? featured?.city]
      .filter(Boolean)
      .join(" · ") || "Pune";
  const rating =
    featured && featured.avgRating > 0 ? formatRating(featured.avgRating) : null;
  const featuredCover =
    featured && isUsableImageSrc(featured.coverImageUrl) ? featured.coverImageUrl : null;
  const cover = pickImageSrc(
    featuredCover,
    featured
      ? categoryCover(featured.categorySlugs?.[0], featured.categoryLabel)
      : MEDIA.curry,
  );
  const areaLabel = featured?.suburb ?? featured?.city ?? "Pune";
  const distanceKm =
    featured?.distanceM != null ? `${(featured.distanceM / 1000).toFixed(1)} km` : null;

  return (
    <div className="relative isolate mx-auto w-full max-w-lg lg:max-w-none">
      <div aria-hidden className="ap-hero-glow" />
      <div
        className="from-sea/20 to-primary/10 pointer-events-none absolute -inset-2 -z-10 rounded-[2.75rem] bg-gradient-to-br via-transparent blur-xl"
        aria-hidden
      />
      <div className="ap-glass border-border/70 relative overflow-hidden rounded-[2.25rem] border p-2.5 shadow-[0_40px_100px_-52px_var(--surface-shadow)] sm:p-3.5">
        <div className="ap-map-canvas ap-map-premium border-border/80 relative min-h-[26.5rem] overflow-hidden rounded-[1.65rem] border p-4 sm:min-h-[32rem] sm:p-5 [@media(max-height:540px)]:min-h-[22rem]">
          <div className="ap-map-wash pointer-events-none absolute inset-0" aria-hidden />
          <div
            className="ap-map-grid pointer-events-none absolute inset-0 opacity-20"
            aria-hidden
          />
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
            viewBox="0 0 480 520"
            aria-hidden
          >
            <path
              d="M-20 95C70 55 135 155 225 138C320 120 352 28 510 82"
              fill="none"
              stroke="currentColor"
              strokeWidth="11"
              className="text-foreground/8"
            />
            <path
              d="M-5 480C115 414 92 290 212 262C330 234 354 370 510 312"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-sea/20"
            />
            <path
              d="M60 10C105 120 34 198 118 278C180 336 156 438 110 530"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeDasharray="4 12"
              className="text-foreground/10"
            />
            <circle cx="260" cy="205" r="104" className="fill-sea/8" />
            <circle cx="260" cy="205" r="44" className="fill-primary/8" />
          </svg>

          <div className="relative flex items-center justify-between">
            <span className="bg-card/85 text-foreground ring-border inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ring-1 backdrop-blur-md">
              <Sparkles className="text-sea size-3.5" aria-hidden />
              {featured ? "Live listing" : "Discovery preview"}
            </span>
            <span className="bg-card/85 text-sea ring-border inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ring-1 backdrop-blur-md">
              <LocateFixed className="size-3.5" aria-hidden />
              {areaLabel}
            </span>
          </div>

          <div className="bg-card/90 ring-border relative mt-5 rounded-2xl p-2 shadow-[0_14px_35px_-24px_var(--surface-shadow)] ring-1 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="bg-sea/10 text-sea grid size-9 shrink-0 place-items-center rounded-xl">
                <Search className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.12em] uppercase">
                  Example search
                </p>
                <p className="text-foreground mt-0.5 truncate text-sm font-medium">
                  Chicken curry under ₹300 near me
                </p>
              </div>
              <span className="bg-sea text-primary-foreground grid size-8 shrink-0 place-items-center rounded-xl shadow-sm">
                <Sparkles className="size-3.5" aria-hidden />
              </span>
            </div>
          </div>

          <div className="bg-card/95 ring-border relative mt-4 ml-auto w-[94%] overflow-hidden rounded-[1.6rem] shadow-[0_30px_70px_-38px_rgb(15_23_42/0.5)] ring-1 backdrop-blur-md">
            <div className="group relative h-36 overflow-hidden">
              {featuredCover ? (
                <BusinessImage
                  src={featuredCover}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 88vw, 28rem"
                  loading="eager"
                  fetchPriority="high"
                  quality={85}
                  className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105"
                />
              ) : (
                <CoverPhoto
                  src={cover}
                  alt=""
                  sizes="(max-width: 640px) 88vw, 28rem"
                  priority
                  quality={85}
                  className="transition duration-700 group-hover:scale-105"
                />
              )}
              <div
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgb(0_0_0/58%),transparent_58%)]"
                aria-hidden
              />
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="text-sea inline-flex items-center gap-1.5 rounded-full bg-white/92 px-2.5 py-1.5 text-[10px] font-bold tracking-[0.08em] uppercase shadow-sm backdrop-blur">
                  <Sparkles className="size-3" aria-hidden />
                  {featured ? "Published" : "Preview"}
                </span>
                {featured?.openNow ? (
                  <span className="bg-success/90 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur">
                    <span className="size-1.5 rounded-full bg-white" aria-hidden />
                    Open now
                  </span>
                ) : null}
              </div>
              {rating ? (
                <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
                  <Star className="size-3.5 fill-amber-300 text-amber-300" aria-hidden />
                  {rating}
                  {featured && featured.reviewCount > 0 ? (
                    <span className="font-normal text-white/65">
                      ({featured.reviewCount})
                    </span>
                  ) : null}
                </span>
              ) : null}
            </div>

            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-ink text-xl leading-tight">{name}</p>
                  <p className="text-muted-foreground mt-1 inline-flex items-center gap-1.5 text-xs">
                    <MapPin className="text-sea size-3.5" aria-hidden />
                    {place}
                  </p>
                </div>
                {featured?.isVerified ? (
                  <span className="bg-success-surface text-success inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-semibold">
                    <BadgeCheck className="size-3.5" aria-hidden />
                    Verified
                  </span>
                ) : null}
              </div>

              <div className="bg-sea/8 border-sea/10 mt-4 flex items-center gap-3 rounded-2xl border px-3 py-2.5">
                <span className="bg-sea text-primary-foreground grid size-8 shrink-0 place-items-center rounded-xl">
                  <ShieldCheck className="size-4" aria-hidden />
                </span>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-foreground text-xs font-semibold">
                      {featured?.matchedItem
                        ? "Exact dish match"
                        : "Best matches near you"}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-[10px]">
                      {featured?.matchedItem
                        ? `${featured.matchedItem} is confirmed on the menu`
                        : "WhatsApp, call, or get directions in one tap."}
                    </p>
                  </div>
                </div>
              </div>

              {distanceKm ? (
                <div className="border-border mt-4 grid grid-cols-2 divide-x border-t pt-3 text-xs">
                  <span className="text-muted-foreground inline-flex items-center gap-2">
                    <Navigation className="text-sea size-3.5" aria-hidden />
                    <span>
                      <strong className="text-foreground block font-semibold">
                        {distanceKm}
                      </strong>
                      from you
                    </span>
                  </span>
                  <span className="text-muted-foreground inline-flex items-center justify-end gap-2 pl-3">
                    <Clock3 className="text-sea size-3.5" aria-hidden />
                    <span>
                      <strong className="text-foreground block font-semibold">
                        Open hours
                      </strong>
                      on the listing
                    </span>
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div
            className="absolute top-[44%] left-[4%] flex items-center gap-1.5"
            aria-hidden
          >
            <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-full text-[11px] font-semibold shadow-lg ring-2 ring-white/85">
              2
            </span>
          </div>
          <div
            className="bg-sea/90 absolute bottom-[9%] left-[9%] size-2.5 rounded-full ring-4 ring-white/70"
            aria-hidden
          />
          <div
            className="bg-primary/80 absolute top-[33%] right-[8%] size-2 rounded-full ring-4 ring-white/60"
            aria-hidden
          />
        </div>
        <div className="text-muted-foreground relative flex items-start gap-2 px-2 pt-3 text-[11px] leading-relaxed sm:text-xs">
          <ShieldCheck className="text-sea size-4" aria-hidden />
          Organic matches stay independent from clearly labeled sponsored results.
        </div>
      </div>
    </div>
  );
}
