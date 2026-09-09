import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  MapPinned,
  Sparkles,
} from "lucide-react";
import { COMMON_SERVICES } from "@/config/consumer-content";
import { SearchBox } from "@/components/search/search-box";
import { ScrollLink } from "@/components/navigation/scroll-link";
import { BusinessResultCard } from "@/components/search/business-result-card";
import { EmptyState } from "@/components/states/empty-state";
import { Button } from "@/components/ui/button";
import { CoverPhoto } from "@/components/media/cover-photo";
import { CategoryIcon, IntentIcon } from "@/components/media/discovery-icon";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getHomepageContent } from "@/services/consumer/homepage-service";
import { Reveal } from "@/features/consumer/reveal";
import { HeroStage } from "@/features/home/hero-stage";
import { PopularItemsGallery } from "@/features/home/popular-items-gallery";
import { categoryCover, MEDIA } from "@/config/visual-media";

export const revalidate = 120;

export const metadata = buildPageMetadata({
  title: "What are you looking for?",
  description:
    "Search Pune by dish, service, and budget — chicken curry under ₹300, a haircut open now, a black shirt for office.",
  path: "/",
});

export default async function HomePage() {
  const content = await getHomepageContent();

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:gap-20 lg:pt-24 lg:pb-24">
          <Reveal>
            <p className="ap-kicker">Pune · Nearby, under budget</p>
            <h1 className="font-display text-ink mt-5 max-w-2xl text-4xl leading-[1.08] tracking-[-0.035em] text-balance sm:text-6xl lg:text-7xl">
              What are you{" "}
              <em className="ap-text-shimmer not-italic">looking for</em>?
            </h1>
            <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed sm:text-xl">
              Type the thing, the budget, and where. We match places that actually sell it
              — then WhatsApp, call, or go.
            </p>
            <div className="mt-9">
              <SearchBox />
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {content.popularSearches.map((q) => (
                <li key={q}>
                  <Link
                    href={`/search?q=${encodeURIComponent(q)}`}
                    className="border-border bg-card hover:border-sea/40 hover:text-sea inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm"
                  >
                    {q}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-border mt-8 grid max-w-xl grid-cols-3 gap-3 border-t pt-6 sm:gap-5">
              <div className="min-w-0">
                <p className="text-foreground text-[0.95rem] font-semibold sm:text-lg">
                  Intent-first
                </p>
                <p className="text-muted-foreground mt-1 text-xs">Dish, job, budget</p>
              </div>
              <div className="min-w-0">
                <p className="text-foreground text-[0.95rem] font-semibold sm:text-lg">
                  Real rupees
                </p>
                <p className="text-muted-foreground mt-1 text-xs">Under ₹300, not ₹₹₹</p>
              </div>
              <div className="min-w-0">
                <p className="text-foreground text-[0.95rem] font-semibold sm:text-lg">
                  One tap
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  WhatsApp, call, share
                </p>
              </div>
            </div>
          </Reveal>

          <HeroStage featured={content.popularBusinesses[0] ?? null} />
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20"
        aria-labelledby="trending"
      >
        <Reveal>
          <div className="border-border bg-background relative isolate overflow-hidden rounded-[2.5rem] border px-5 py-8 shadow-[0_35px_90px_-48px_var(--surface-shadow)] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_10%,var(--ambient-cyan),transparent_32%)]"
              aria-hidden
            />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sea text-xs font-semibold tracking-[0.16em] uppercase">
                  <Sparkles className="mr-2 inline size-3.5" aria-hidden />
                  Live discovery pulse
                </p>
                <h2
                  id="trending"
                  className="font-display text-ink mt-3 text-3xl sm:text-4xl"
                >
                  Trending searches
                </h2>
              </div>
              <p className="text-muted-foreground max-w-xs text-sm leading-relaxed sm:text-right">
                What people in Kharadi, Wagholi, and Lohegaon are looking for right now.
              </p>
            </div>
            <div className="relative mt-9 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {content.trendingSearches.map((q, index) => (
                <Link
                  key={q}
                  href={`/search?q=${encodeURIComponent(q)}`}
                  className={`group border-border bg-card/75 hover:border-sea/25 hover:bg-card flex min-h-[6.5rem] items-center gap-4 rounded-[1.35rem] border px-4 py-4 shadow-[0_18px_48px_-36px_var(--surface-shadow)] backdrop-blur-sm transition duration-300 hover:shadow-[0_24px_55px_-34px_var(--surface-shadow)] sm:px-5 [@media(hover:hover)]:hover:-translate-y-0.5 ${
                    index === 0 ? "md:col-span-2 lg:col-span-2" : ""
                  }`}
                >
                  <span className="font-display text-sea/45 w-8 text-2xl">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="from-sea/15 to-sea/5 text-sea grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ring-1 ring-current/10 transition duration-300 ring-inset group-hover:scale-105 group-hover:-rotate-2">
                    <IntentIcon query={q} className="size-4.5" />
                  </span>
                  <span className="text-foreground min-w-0 flex-1 font-medium">{q}</span>
                  <span className="border-border bg-background/60 text-muted-foreground group-hover:bg-sea group-hover:text-primary-foreground grid size-9 shrink-0 place-items-center rounded-full border transition duration-300 group-hover:rotate-6">
                    <ArrowUpRight className="size-4" aria-hidden />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <section className="ap-defer-paint" aria-labelledby="popular-businesses">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
          <Reveal>
            <h2
              id="popular-businesses"
              className="font-display text-ink text-3xl sm:text-4xl"
            >
              Best matches near you
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {content.dataSource === "supabase"
                ? "Live Pune listings you can WhatsApp, call, or navigate to. Place data includes OpenStreetMap (ODbL)."
                : "New local businesses will appear here as their profiles go live."}
            </p>
            <div className="mt-8">
              {content.popularBusinesses.length === 0 ? (
                <EmptyState
                  title="No published businesses yet"
                  description="New local businesses will appear here as their profiles go live. You can still explore with search."
                  actionLabel="Try a search"
                  actionHref="/search?q=chicken+curry+under+₹300+near+me"
                />
              ) : (
                <div className="grid gap-4">
                  {content.popularBusinesses.map((business) => (
                    <BusinessResultCard key={business.id} business={business} />
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <section
        className="ap-defer-paint mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-24"
        aria-labelledby="popular-items"
      >
        <Reveal>
          <p className="ap-kicker">Editor’s picks</p>
          <h2
            id="popular-items"
            className="font-display text-ink mt-3 text-3xl sm:text-4xl"
          >
            Popular items & services
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
            The dishes, drinks, and jobs Pune looks for first — photographed, not listed.
          </p>
          <PopularItemsGallery items={content.popularItems} />
        </Reveal>
      </section>

      <section
        className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20"
        aria-labelledby="common-services"
      >
        <Reveal>
          <p className="ap-kicker">Home & local</p>
          <h2
            id="common-services"
            className="font-display text-ink mt-3 text-3xl sm:text-4xl"
          >
            Common services
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm">
            Everyday help around the house — search by the job, not the shop name.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {COMMON_SERVICES.map((service) => (
              <ScrollLink
                key={service.slug}
                href={service.href}
                className="ap-surface-interactive group flex min-h-[7.5rem] flex-col rounded-2xl p-5"
              >
                <span className="bg-sea/10 text-sea grid size-10 place-items-center rounded-2xl">
                  <CategoryIcon slug={service.slug} className="size-5" />
                </span>
                <span className="mt-4 font-medium">{service.name}</span>
                <span className="text-muted-foreground mt-1 text-xs">
                  {service.blurb}
                </span>
                <span className="text-sea mt-3 inline-flex items-center gap-1 text-xs font-medium">
                  Search nearby <ArrowRight className="size-3.5" aria-hidden />
                </span>
              </ScrollLink>
            ))}
          </div>
        </Reveal>
      </section>

      <section
        className="border-border/60 bg-card/35 relative overflow-hidden border-y"
        aria-labelledby="categories"
      >
        <div
          className="ap-section-glow pointer-events-none absolute inset-0"
          aria-hidden
        />
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-24">
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="ap-kicker">If you would rather browse</p>
                <h2
                  id="categories"
                  className="font-display text-ink mt-3 text-3xl sm:text-4xl"
                >
                  Or browse a category
                </h2>
              </div>
              <p className="text-muted-foreground max-w-sm text-sm leading-relaxed sm:text-right">
                Fallback when you are not sure what to type. Search is still the faster
                path.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {content.categories.map((category, index) => (
                <Link
                  key={category.slug}
                  href={`/${category.slug}/pune`}
                  className="group relative flex min-h-[19rem] flex-col overflow-hidden rounded-[1.75rem] p-5 shadow-[0_28px_65px_-38px_rgb(6_16_28/0.75)] ring-1 ring-black/5 transition duration-500 sm:p-6 [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:shadow-[0_32px_70px_-34px_rgb(6_16_28/0.8)]"
                >
                  <CoverPhoto
                    src={categoryCover(category.slug, category.name)}
                    alt=""
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    quality={80}
                    loading="lazy"
                    className="transition duration-700 ease-out group-hover:scale-[1.07]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(6_16_28/12%)_0%,rgb(6_16_28/18%)_35%,rgb(6_16_28/88%)_100%)]" />
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-2xl bg-white/14 text-white ring-1 ring-white/20 backdrop-blur-md">
                      <CategoryIcon slug={category.slug} className="size-5" />
                    </span>
                    <span className="font-display text-sm text-white/65">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="relative z-10 mt-auto">
                    <p className="font-display text-2xl text-white sm:text-[1.7rem]">
                      {category.name}
                    </p>
                    <div className="mt-2 flex items-end gap-3">
                      <p className="min-w-0 flex-1 text-sm leading-relaxed text-white/72">
                        {category.description ??
                          `Explore ${category.name.toLowerCase()} in Pune`}
                      </p>
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-slate-900 transition duration-300 group-hover:scale-105 group-hover:rotate-6">
                        <ArrowUpRight className="size-4" aria-hidden />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="ap-defer-paint" aria-labelledby="areas">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
          <Reveal>
            <div className="ap-brand-panel relative min-h-[22rem] overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-12">
              <CoverPhoto
                src={MEDIA.puneCity}
                alt=""
                sizes="(max-width: 1280px) 100vw, 80rem"
                quality={75}
                className="scale-105 object-[center_48%]"
              />
              <div className="ap-brand-scrim pointer-events-none absolute inset-0" />
              <div className="relative z-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
                <div>
                  <p className="text-brand-on/70 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase">
                    <MapPinned className="size-3.5" aria-hidden />
                    Pune, neighborhood by neighborhood
                  </p>
                  <h2
                    id="areas"
                    className="font-display text-brand-on mt-3 text-4xl sm:text-5xl"
                  >
                    Explore areas
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {content.areas.map((area) => (
                    <Link
                      key={area.slug}
                      href={`/areas/${area.slug}`}
                      className="text-brand-on inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/12 px-4 py-2.5 text-sm ring-1 ring-white/20"
                    >
                      <MapPin className="size-3.5 opacity-80" aria-hidden />
                      {area.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28"
        aria-labelledby="biz-cta"
      >
        <Reveal>
          <div className="ap-glass relative overflow-hidden rounded-[1.75rem] px-6 py-12 sm:px-12">
            <div className="ap-accent-radial pointer-events-none absolute inset-0" />
            <h2
              id="biz-cta"
              className="font-display text-ink relative text-3xl sm:text-4xl"
            >
              Own a local business?
            </h2>
            <p className="text-muted-foreground relative mt-3 max-w-xl">
              Claim your profile, add the dishes and services people search for, and show
              up when intent matches what you offer.
            </p>
            <Button asChild className="ap-cta-glow relative mt-8 min-h-11 px-6" size="lg">
              <Link href="/business/onboarding">List your business</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
