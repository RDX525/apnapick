import Link from "next/link";
import { BackLink } from "@/components/navigation/back-link";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { cache } from "react";
import { notFound } from "next/navigation";
import { BusinessResultCard } from "@/components/search/business-result-card";
import { EmptyState } from "@/components/states/empty-state";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbListJsonLd,
  jsonLdScript,
  organizationJsonLd,
  itemListJsonLd,
} from "@/lib/seo/json-ld";
import { DEFAULT_AREAS, DEFAULT_CATEGORIES } from "@/config/consumer-content";
import { titleCaseSlug } from "@/config/seo-taxonomy";
import { seoPageMeetsDensity } from "@/config/seo-density";
import { PUNE_AREAS } from "@/domain/catalog/lexicon";
import { listPublishedBusinesses } from "@/repositories/consumer/business-repository";
import type { SeoHubPage } from "@/domain/seo/types";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 120;

function isLiveAreaPageSlug(slug: string) {
  return slug === "pune" || DEFAULT_AREAS.some((area) => area.slug === slug);
}

const getAreaBusinesses = cache(async (slug: string) => {
  const { items } = await listPublishedBusinesses(80);
  if (slug === "pune") return items;
  return items.filter((business) => {
    const suburb = business.suburb?.toLowerCase().replace(/\s+/g, "-");
    return suburb === slug || business.city?.toLowerCase() === slug;
  });
});

export async function generateMetadata({ params }: Props) {
  const { slug: raw } = await params;
  const slug = raw.toLowerCase();
  if (!isLiveAreaPageSlug(slug)) notFound();
  const label = PUNE_AREAS[slug]?.label ?? titleCaseSlug(slug);
  const businesses = await getAreaBusinesses(slug);
  const indexable = seoPageMeetsDensity("area", businesses.length);

  return buildPageMetadata({
    title: `${label} · Local discovery`,
    description: `Explore businesses and popular searches in ${label} on ApnaPick.`,
    path: `/areas/${slug}`,
    noIndex: !indexable,
    follow: true,
  });
}

export default async function AreaPage({ params }: Props) {
  const { slug: raw } = await params;
  const slug = raw.toLowerCase();
  if (!isLiveAreaPageSlug(slug)) notFound();
  const known = DEFAULT_AREAS.find((a) => a.slug === slug);
  const label = PUNE_AREAS[slug]?.label ?? known?.name ?? titleCaseSlug(slug);

  const businesses = (await getAreaBusinesses(slug)).slice(0, 40);

  const indexable = seoPageMeetsDensity("area", businesses.length);

  const hubStub: SeoHubPage = {
    path: `/areas/${slug}`,
    canonicalPath: `/areas/${slug}`,
    pageType: "area",
    categorySlug: "",
    categoryName: "",
    areaSlug: slug,
    areaName: label,
    facetSlug: null,
    facetName: null,
    itemSlug: null,
    itemName: null,
    title: `Explore ${label}`,
    description: "",
    h1: "",
    intro: "",
    indexable,
    noIndexReason: indexable ? null : "insufficient_density",
    businessCount: businesses.length,
    itemCount: 0,
    businesses,
    catalogItems: [],
    breadcrumbs:
      slug === "pune"
        ? [
            { name: "Home", path: "/" },
            { name: label, path: `/areas/${slug}` },
          ]
        : [
            { name: "Home", path: "/" },
            { name: "Areas", path: "/areas/pune" },
            { name: label, path: `/areas/${slug}` },
          ],
    relatedLinks: [],
    schemaKind: "mixed",
  };

  const structured = [
    organizationJsonLd(),
    breadcrumbListJsonLd(hubStub.breadcrumbs),
    ...(businesses.length
      ? [itemListJsonLd(hubStub, { name: `Businesses in ${label}` })]
      : []),
  ];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(structured)}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <BackLink href={slug === "pune" ? "/" : "/areas/pune"} />
        <Breadcrumbs items={hubStub.breadcrumbs} />
      </div>

      <h1 className="font-display text-ink mt-4 text-3xl sm:text-4xl">Explore {label}</h1>
      <p className="text-muted-foreground mt-2 max-w-2xl">
        {indexable
          ? `Discover places around ${label} by category or search intent.`
          : `Explore nearby searches while more local businesses complete their profiles.`}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {DEFAULT_CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/${c.slug}/${slug === "pune" ? "pune" : slug}`}
            className="bg-card/70 text-secondary-foreground ring-sea/10 hover:bg-card rounded-full px-3 py-1.5 text-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            {c.name}
          </Link>
        ))}
      </div>

      <section className="mt-10" aria-labelledby="area-listings">
        <h2 id="area-listings" className="font-display text-ink text-2xl">
          Local businesses
        </h2>
        <div className="mt-6 space-y-4">
          {businesses.length === 0 ? (
            <EmptyState
              title={`No published listings in ${label} yet`}
              description="Try searching nearby while local businesses add their details."
              actionLabel="Search this area"
              actionHref={`/search?q=${encodeURIComponent(`best restaurants in ${label}`)}`}
            />
          ) : (
            businesses.map((b) => <BusinessResultCard key={b.id} business={b} />)
          )}
        </div>
      </section>
    </main>
  );
}
