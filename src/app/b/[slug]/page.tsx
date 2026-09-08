import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, ExternalLink, Globe, MapPin, Navigation, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ClaimedBadge, VerifiedBadge } from "@/components/trust/verified-badge";
import { RatingStars } from "@/components/trust/rating-summary";
import { BusinessReviewsSection } from "@/features/reviews/business-reviews-section";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  jsonLdScript,
  localBusinessJsonLd,
  organizationJsonLd,
  productJsonLd,
  serviceJsonLd,
} from "@/lib/seo/json-ld";
import { getBusinessBySlug } from "@/repositories/consumer/business-repository";
import {
  getBusinessRatingSummary,
  getOwnReviewForBusiness,
  isBusinessOwner,
} from "@/repositories/reviews/review-repository";
import { getSessionUser } from "@/lib/auth/session";
import type { PublicReview } from "@/domain/reviews/types";
import { BusinessImage } from "@/components/media/business-image";
import { CoverPhoto } from "@/components/media/cover-photo";
import { categoryCover } from "@/config/visual-media";

type Props = { params: Promise<{ slug: string }> };

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) {
    return buildPageMetadata({
      title: "Business not found",
      description: "This listing is unavailable.",
      path: `/b/${slug}`,
      noIndex: true,
    });
  }
  return buildPageMetadata({
    title: business.name,
    description: business.description ?? `${business.name} on ApnaPick`,
    path: `/b/${business.slug}`,
    imageUrl: business.photos[0]?.url,
  });
}

function formatPrice(cents: number | null) {
  if (cents == null) return null;
  return `₹${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default async function BusinessProfilePage({ params }: Props) {
  const { slug } = await params;
  const [business, session] = await Promise.all([
    getBusinessBySlug(slug),
    getSessionUser(),
  ]);

  if (!business) {
    notFound();
  }

  const [ratingSummary, owner, ownReview] = await Promise.all([
    getBusinessRatingSummary(business.id),
    session ? isBusinessOwner(business.id, session.id) : Promise.resolve(false),
    session ? getOwnReviewForBusiness(business.id, session.id) : Promise.resolve(null),
  ]);

  const initialReviews: PublicReview[] = business.reviews.map((r) => ({
    id: r.id,
    businessId: business.id,
    userId: r.userId,
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: "PUBLISHED",
    authorName: r.authorName,
    createdAt: r.createdAt,
    updatedAt: r.createdAt,
    replyBody: r.replyBody,
    repliedAt: r.repliedAt,
    isOwn: session?.id === r.userId,
  }));

  const jsonLd = [
    organizationJsonLd(),
    localBusinessJsonLd(business),
    ...business.products.slice(0, 5).map((p) =>
      productJsonLd({
        name: p.name,
        description: p.description,
        businessName: business.name,
        businessPath: `/b/${business.slug}`,
        priceCents: p.priceCents,
      }),
    ),
    ...business.services.slice(0, 5).map((s) =>
      serviceJsonLd({
        name: s.name,
        description: s.description,
        providerName: business.name,
        providerPath: `/b/${business.slug}`,
        areaName: business.suburb ?? business.city,
      }),
    ),
  ];

  const mapsQuery = encodeURIComponent(
    [business.name, business.addressLine1, business.suburb, business.city, "Pune"]
      .filter(Boolean)
      .join(", "),
  );
  const todayName = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  const hasProducts = business.products.length > 0;
  const hasServices = business.services.length > 0;
  const hasMenu = business.menu.length > 0;
  const hasOffers = business.offers.length > 0;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-24 sm:px-6 lg:pb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(jsonLd)} />

      <div className="ap-surface overflow-hidden rounded-[1.75rem]">
        <div className="flex snap-x snap-mandatory gap-1 overflow-x-auto sm:grid sm:grid-cols-3 sm:grid-rows-2 sm:overflow-visible">
          <div
            className={`ap-media-gradient relative min-h-52 w-[88%] shrink-0 snap-center sm:row-span-2 sm:min-h-[320px] sm:w-auto ${
              business.photos.length > 1 ? "sm:col-span-2" : "sm:col-span-3"
            }`}
          >
            {business.photos[0] ? (
              <BusinessImage
                src={business.photos[0].url}
                alt={business.photos[0].alt ?? business.name}
                fill
                sizes="(max-width: 639px) 100vw, 66vw"
                loading="eager"
                fetchPriority="high"
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <>
                <CoverPhoto
                  src={categoryCover(business.categorySlugs?.[0], business.categoryLabel)}
                  alt=""
                  sizes="(max-width: 639px) 100vw, 66vw"
                  priority
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(0_0_0/70%),transparent_55%)]" />
                <div className="absolute inset-0 flex items-end p-6 sm:p-8">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {business.categoryLabel ?? "Local business"}
                    </p>
                    <p className="mt-1 text-xs text-white/75">
                      Photos from this business are coming soon
                    </p>
                  </div>
                </div>
              </>
            )}
            {business.photos.length > 1 ? (
              <span className="bg-card/90 text-foreground ring-border absolute right-3 bottom-3 rounded-full px-3 py-1.5 text-xs font-medium ring-1 backdrop-blur sm:hidden">
                1 / {business.photos.length}
              </span>
            ) : null}
          </div>
          {business.photos.slice(1, 3).map((photo, index) => (
            <div
              key={photo.id}
              className="ap-media-gradient-soft relative min-h-52 w-[76%] shrink-0 snap-center sm:min-h-36 sm:w-auto"
            >
              <BusinessImage
                src={photo.url}
                alt={photo.alt ?? `${business.name} photo ${index + 2}`}
                fill
                sizes="(max-width: 639px) 76vw, 33vw"
                className="absolute inset-0 size-full object-cover"
              />
              <span className="bg-card/90 text-foreground absolute right-3 bottom-3 rounded-full px-2.5 py-1 text-xs font-medium sm:hidden">
                {index + 2} / {business.photos.length}
              </span>
            </div>
          ))}
        </div>

        <div className="px-5 py-6 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-ink text-3xl sm:text-4xl">
                  {business.name}
                </h1>
                <VerifiedBadge verified={business.isVerified} />
                <ClaimedBadge
                  claimed={business.isClaimed}
                  verified={business.isVerified}
                />
                {business.openNow === true ? (
                  <Badge className="bg-sea/15 text-sea hover:bg-sea/15">Open now</Badge>
                ) : business.openNow === false ? (
                  <Badge variant="outline">Closed</Badge>
                ) : null}
              </div>

              <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
                <span className="text-foreground inline-flex items-center gap-2">
                  <RatingStars
                    value={ratingSummary.average || business.avgRating}
                    size="sm"
                  />
                  <span className="font-medium tabular-nums">
                    {ratingSummary.count > 0
                      ? ratingSummary.average.toFixed(1)
                      : business.avgRating > 0
                        ? business.avgRating.toFixed(1)
                        : "New"}
                  </span>
                  <span className="text-muted-foreground">
                    ({ratingSummary.count || business.reviewCount} reviews)
                  </span>
                </span>
                {business.categoryLabel ? <span>{business.categoryLabel}</span> : null}
                {(business.suburb || business.city) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden />
                    {[business.suburb, business.city].filter(Boolean).join(", ")}
                  </span>
                )}
                {business.priceLevel ? (
                  <span aria-label={`Price level ${business.priceLevel}`}>
                    {"₹".repeat(business.priceLevel)}
                  </span>
                ) : null}
              </div>

              {business.description ? (
                <p className="text-muted-foreground max-w-2xl">{business.description}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {business.phone ? (
                <Button asChild className="min-h-10">
                  <a href={`tel:${business.phone}`}>
                    <Phone className="size-4" aria-hidden />
                    Call
                  </a>
                </Button>
              ) : null}
              <Button asChild variant="outline" className="min-h-10">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation className="size-4" aria-hidden />
                  Directions
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </Button>
              {business.website ? (
                <Button asChild variant="outline" className="min-h-10">
                  <a href={business.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="size-4" aria-hidden />
                    Website
                    <ExternalLink className="size-3.5 opacity-60" aria-hidden />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <nav
        aria-label="Business profile sections"
        className="border-border/70 bg-background/90 sticky top-[var(--ap-header-offset)] z-30 mt-4 flex [scrollbar-width:none] gap-2 overflow-x-auto border-y py-2 backdrop-blur [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {business.products.length > 0 ? (
          <a
            href="#products-heading"
            className="bg-secondary inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm"
          >
            Products
          </a>
        ) : null}
        {business.services.length > 0 ? (
          <a
            href="#services-heading"
            className="bg-secondary inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm"
          >
            Services
          </a>
        ) : null}
        {business.menu.length > 0 ? (
          <a
            href="#menu-heading"
            className="bg-secondary inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm"
          >
            Menu
          </a>
        ) : null}
        {business.offers.length > 0 ? (
          <a
            href="#offers-heading"
            className="bg-secondary inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm"
          >
            Offers
          </a>
        ) : null}
        <a
          href="#location-heading"
          className="bg-secondary inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm"
        >
          Location
        </a>
        <a
          href="#hours-heading"
          className="bg-secondary inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm"
        >
          Hours
        </a>
      </nav>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-10">
          {hasProducts ? (
            <section aria-labelledby="products-heading">
              <h2 id="products-heading" className="font-display text-ink text-2xl">
                Products & dishes
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {business.products.map((item) => (
                  <li
                    key={item.id}
                    className="ap-surface-interactive rounded-2xl px-5 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description ? (
                          <p className="text-muted-foreground mt-1 text-sm">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                      {formatPrice(item.priceCents) ? (
                        <span className="text-muted-foreground text-sm">
                          {formatPrice(item.priceCents)}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasServices ? (
            <section aria-labelledby="services-heading">
              <h2 id="services-heading" className="font-display text-ink text-2xl">
                Services
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {business.services.map((item) => (
                  <li
                    key={item.id}
                    className="ap-surface-interactive rounded-2xl px-5 py-4"
                  >
                    <p className="font-medium">{item.name}</p>
                    {item.description ? (
                      <p className="text-muted-foreground mt-1 text-sm">
                        {item.description}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasMenu ? (
            <section aria-labelledby="menu-heading">
              <h2 id="menu-heading" className="font-display text-ink text-2xl">
                Menu
              </h2>
              <div className="mt-4 space-y-6">
                {business.menu.map((menu) => (
                  <div key={menu.id}>
                    <p className="text-sea text-sm font-medium">{menu.name}</p>
                    {menu.categories.map((cat) => (
                      <div key={cat.id} className="mt-3">
                        <h3 className="text-foreground text-sm font-medium">
                          {cat.name}
                        </h3>
                        <ul className="mt-2 space-y-2">
                          {cat.items.map((item) => (
                            <li
                              key={item.id}
                              className="flex justify-between gap-3 text-sm"
                            >
                              <span>{item.name}</span>
                              <span className="text-muted-foreground">
                                {formatPrice(item.priceCents) ?? ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {hasOffers ? (
            <section aria-labelledby="offers-heading">
              <h2 id="offers-heading" className="font-display text-ink text-2xl">
                Offers
              </h2>
              <ul className="mt-4 space-y-3">
                {business.offers.map((offer) => (
                  <li
                    key={offer.id}
                    className="border-border/70 bg-mist rounded-xl border px-4 py-3"
                  >
                    <p className="font-medium">{offer.title}</p>
                    {offer.discountLabel ? (
                      <p className="text-sea text-sm">{offer.discountLabel}</p>
                    ) : null}
                    {offer.description ? (
                      <p className="text-muted-foreground mt-1 text-sm">
                        {offer.description}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section
            aria-labelledby="about-heading"
            hidden={!business.about && business.amenities.length === 0}
          >
            <h2 id="about-heading" className="font-display text-ink text-2xl">
              About
            </h2>
            <p className="text-muted-foreground mt-3">
              {business.about ?? "No description yet."}
            </p>
            {business.amenities.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {business.amenities.map((a) => (
                  <Badge key={a.key} variant="outline">
                    {a.label}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground mt-3 text-sm">
                Amenities not listed yet.
              </p>
            )}
          </section>

          <BusinessReviewsSection
            businessId={business.id}
            businessSlug={business.slug}
            initialSummary={ratingSummary}
            initialReviews={initialReviews}
            initialOwnReview={ownReview}
            signedIn={Boolean(session)}
            canReply={
              owner ||
              Boolean(session?.roles.some((r) => r === "ADMIN" || r === "SUPER_ADMIN"))
            }
          />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[var(--ap-header-offset)] lg:self-start">
          <div className="ap-surface rounded-2xl p-5">
            <h2 id="location-heading" className="font-medium">
              Location
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {[business.addressLine1, business.suburb, business.city, business.postcode]
                .filter(Boolean)
                .join(", ") || "Address coming soon"}
            </p>
            <div className="ap-map-canvas ap-map-premium border-border relative mt-4 aspect-[4/3] overflow-hidden rounded-2xl border">
              <div
                className="ap-map-wash pointer-events-none absolute inset-0"
                aria-hidden
              />
              <div className="ap-map-grid absolute inset-0 opacity-30" aria-hidden />
              <div className="absolute inset-0 grid place-items-center">
                <span className="bg-primary text-primary-foreground ring-background/70 grid size-11 place-items-center rounded-full ring-4">
                  <MapPin className="size-5" aria-hidden />
                </span>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-card/90 text-foreground ring-border absolute right-3 bottom-3 rounded-full px-3 py-2 text-xs font-medium ring-1 backdrop-blur"
              >
                Open directions
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </div>

          <div className="ap-surface rounded-2xl p-5">
            <h2 id="hours-heading" className="flex items-center gap-2 font-medium">
              <Clock className="text-sea size-4" aria-hidden />
              Opening hours
            </h2>
            {business.hours.length === 0 ? (
              <p className="text-muted-foreground mt-3 text-sm">Hours not listed yet.</p>
            ) : (
              <ul className="mt-3 space-y-1.5 text-sm">
                {business.hours
                  .slice()
                  .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                  .map((h) => (
                    <li
                      key={h.dayOfWeek}
                      className={
                        DAY_LABELS[h.dayOfWeek] === todayName
                          ? "bg-secondary -mx-2 flex justify-between gap-3 rounded-lg px-2 py-1 font-medium"
                          : "flex justify-between gap-3"
                      }
                    >
                      <span
                        className={
                          DAY_LABELS[h.dayOfWeek] === todayName
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {DAY_LABELS[h.dayOfWeek]}
                        {DAY_LABELS[h.dayOfWeek] === todayName ? " · Today" : ""}
                      </span>
                      <span>
                        {h.isClosed
                          ? "Closed"
                          : `${h.opensAt?.slice(0, 5) ?? "—"} – ${h.closesAt?.slice(0, 5) ?? "—"}`}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="border-border/70 bg-mist rounded-2xl border p-5">
            <p className="text-muted-foreground text-sm">
              {owner
                ? "Keep this listing accurate for customers."
                : business.isClaimed
                  ? "See something that needs correcting?"
                  : "Do you manage this business?"}
            </p>
            <Button asChild variant="outline" className="mt-3 min-h-10 w-full">
              <Link
                href={
                  owner
                    ? "/business/dashboard/profile"
                    : business.isClaimed
                      ? "/help"
                      : "/business/onboarding"
                }
              >
                {owner
                  ? "Manage listing"
                  : business.isClaimed
                    ? "Suggest an edit"
                    : "Claim this business"}
              </Link>
            </Button>
          </div>
        </aside>
      </div>

      <Separator className="my-10" />
      <p className="text-muted-foreground text-center text-sm">
        <Link href="/search?q=restaurants+near+me" className="text-sea hover:underline">
          Explore more nearby
        </Link>
      </p>
      <div className="bg-background/94 border-border fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t p-3 [padding-right:max(0.75rem,env(safe-area-inset-right))] [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))] [padding-left:max(0.75rem,env(safe-area-inset-left))] backdrop-blur lg:hidden">
        {business.phone ? (
          <Button asChild className="min-h-11 flex-1">
            <a href={`tel:${business.phone}`}>
              <Phone className="size-4" aria-hidden />
              Call
            </a>
          </Button>
        ) : null}
        <Button
          asChild
          variant={business.phone ? "outline" : "default"}
          className="min-h-11 flex-1"
        >
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Navigation className="size-4" aria-hidden />
            Directions
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Button>
      </div>
    </main>
  );
}
