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
import { SearchQueryLink } from "@/components/search/search-query-link";
import { ScrollLink } from "@/components/navigation/scroll-link";
import { Button } from "@/components/ui/button";
import { CoverPhoto } from "@/components/media/cover-photo";
import { CategoryIcon } from "@/components/media/discovery-icon";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getHomepageContent } from "@/services/consumer/homepage-service";
import { Reveal } from "@/features/consumer/reveal";
import { HeroStage } from "@/features/home/hero-stage";
import { PopularItemsGallery } from "@/features/home/popular-items-gallery";
import { TrendingSearchMarquee } from "@/features/home/trending-search-marquee";
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
      <section className="relative min-w-0 overflow-x-clip">
        <div className="relative mx-auto grid min-w-0 max-w-7xl items-center gap-6 px-4 pt-8 pb-10 sm:px-6 sm:pt-12 lg:grid-cols-[1.04fr_0.96fr] lg:gap-x-20 lg:gap-y-0 lg:pt-24 lg:pb-24">
          <Reveal className="min-w-0">
            <p className="ap-kicker">Pune · Nearby, under budget</p>
            <h1 className="font-display text-ink mt-3 max-w-2xl text-[2.15rem] leading-[1.06] tracking-[-0.045em] text-balance sm:mt-5 sm:text-6xl lg:text-7xl">
              What are you{" "}
              <em className="ap-text-shimmer not-italic">looking for</em>?
            </h1>
            <p className="text-muted-foreground mt-3 max-w-xl text-[0.98rem] leading-relaxed sm:mt-6 sm:text-xl">
              Type a dish, a service, or what you need — plus budget and where.
              <span className="hidden sm:inline">
                {" "}
                We match businesses that actually offer it — then WhatsApp, call, or go.
              </span>
            </p>
            <div className="mt-6 sm:mt-9">
              <SearchBox />
            </div>
            <ul className="mt-4 hidden flex-wrap gap-2 lg:flex">
              {content.popularSearches.map((q) => (
                <li key={q}>
                  <SearchQueryLink
                    query={q}
                    className="border-border bg-card hover:border-sea/40 hover:text-sea inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm"
                  >
                    {q}
                  </SearchQueryLink>
                </li>
              ))}
            </ul>
          </Reveal>

          <div className="min-w-0 lg:row-span-2">
            <HeroStage />
          </div>

          <div className="border-border mt-2 hidden max-w-xl grid-cols-3 gap-3 border-t pt-6 sm:gap-5 lg:mt-8 lg:grid">
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
        </div>
      </section>

      <section
        className="mx-auto min-w-0 max-w-7xl overflow-x-clip px-4 py-10 sm:px-6 sm:py-14 lg:py-20"
        aria-labelledby="trending"
      >
        <Reveal>
          <div className="relative isolate overflow-hidden md:rounded-[2.5rem] md:border md:border-border md:bg-background md:px-8 md:py-10 md:shadow-[0_35px_90px_-48px_var(--surface-shadow)] lg:px-10 lg:py-12">
            <div
              className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(circle_at_88%_10%,var(--ambient-cyan),transparent_32%)] md:block"
              aria-hidden
            />
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
              <div>
                <p className="text-sea text-xs font-semibold tracking-[0.16em] uppercase">
                  <Sparkles className="mr-2 inline size-3.5" aria-hidden />
                  Live discovery pulse
                </p>
                <h2
                  id="trending"
                  className="font-display text-ink mt-2 text-[1.85rem] sm:mt-3 sm:text-4xl"
                >
                  Trending searches
                </h2>
              </div>
              <p className="text-muted-foreground max-w-xs text-sm leading-relaxed sm:text-right">
                What people in Kharadi, Wagholi, and Lohegaon are looking for right now.
              </p>
            </div>
            <TrendingSearchMarquee queries={content.trendingSearches} />
          </div>
        </Reveal>
      </section>

      <section
        className="ap-defer-paint mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:py-24"
        aria-labelledby="popular-items"
      >
        <Reveal>
          <p className="ap-kicker">Editor’s picks</p>
          <h2
            id="popular-items"
            className="font-display text-ink mt-2 text-[1.85rem] sm:mt-3 sm:text-4xl"
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
        className="border-border/60 bg-card/35 relative overflow-hidden border-y"
        aria-labelledby="categories"
      >
        <div
          className="ap-section-glow pointer-events-none absolute inset-0"
          aria-hidden
        />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:py-24">
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="ap-kicker">If you would rather browse</p>
                <h2
                  id="categories"
                  className="font-display text-ink mt-2 text-[1.85rem] sm:mt-3 sm:text-4xl"
                >
                  Or browse a category
                </h2>
              </div>
              <p className="text-muted-foreground max-w-sm text-sm leading-relaxed sm:text-right">
                Fallback when you are not sure what to type. Search is still the faster
                path.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-3">
              {content.categories.map((category, index) => (
                <Link
                  key={category.slug}
                  href={`/${category.slug}/pune`}
                  className="group relative flex min-h-[12.25rem] flex-col overflow-hidden rounded-[1.45rem] p-4 shadow-[0_28px_65px_-38px_rgb(6_16_28/0.75)] ring-1 ring-black/5 sm:min-h-[19rem] sm:rounded-[1.75rem] sm:p-6 [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:shadow-[0_32px_70px_-34px_rgb(6_16_28/0.8)]"
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
                    <span className="grid size-9 place-items-center rounded-2xl bg-white/14 text-white ring-1 ring-white/20 backdrop-blur-md sm:size-11">
                      <CategoryIcon slug={category.slug} className="size-4 sm:size-5" />
                    </span>
                    <span className="font-display hidden text-sm text-white/65 sm:inline">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="relative z-10 mt-auto">
                    <p className="font-display text-[1.02rem] leading-[1.15] text-white sm:text-[1.7rem]">
                      {category.name}
                    </p>
                    <div className="mt-2 hidden items-end gap-3 sm:flex">
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

      <section
        className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:py-20"
        aria-labelledby="common-services"
      >
        <Reveal>
          <p className="ap-kicker">Home & local</p>
          <h2
            id="common-services"
            className="font-display text-ink mt-2 text-[1.85rem] sm:mt-3 sm:text-4xl"
          >
            Common services
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm">
            Everyday help around the house — search by the job, not the shop name.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 lg:grid-cols-4">
            {COMMON_SERVICES.map((service) => (
              <ScrollLink
                key={service.slug}
                href={service.href}
                className="ap-surface-interactive group flex min-h-[8.25rem] flex-col rounded-[1.35rem] p-4 sm:min-h-[7.5rem] sm:rounded-2xl sm:p-5"
              >
                <span className="bg-sea/10 text-sea grid size-10 place-items-center rounded-2xl">
                  <CategoryIcon slug={service.slug} className="size-5" />
                </span>
                <span className="mt-4 font-medium">{service.name}</span>
                <span className="text-muted-foreground mt-1 text-xs">
                  {service.blurb}
                </span>
                <span className="text-sea mt-auto hidden items-center gap-1 text-xs font-medium sm:inline-flex">
                  Search nearby <ArrowRight className="size-3.5" aria-hidden />
                </span>
              </ScrollLink>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="ap-defer-paint" aria-labelledby="areas">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:py-20">
          <Reveal>
            <div className="ap-brand-panel relative min-h-[20rem] overflow-hidden rounded-[1.75rem] px-5 py-8 sm:min-h-[22rem] sm:rounded-[2rem] sm:px-10 sm:py-12">
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
                    Kharadi, Wagholi, and Lohegaon
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
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:py-28"
        aria-labelledby="biz-cta"
      >
        <Reveal>
          <div className="ap-glass relative overflow-hidden rounded-[1.6rem] px-5 py-10 sm:rounded-[1.75rem] sm:px-12 sm:py-12">
            <div className="ap-accent-radial pointer-events-none absolute inset-0" />
            <h2
              id="biz-cta"
              className="font-display text-ink relative text-3xl sm:text-4xl"
            >
              Own a local business?
            </h2>
            <p className="text-muted-foreground relative mt-3 max-w-xl">
              Create an account, list the business, then manage it from your dashboard.
              Customers see you when their search matches what you actually offer.
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
