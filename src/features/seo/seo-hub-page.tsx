import { cache } from "react";
import { permanentRedirect, notFound } from "next/navigation";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { resolveSeoHub } from "@/services/seo/hub-service";
import { SeoHubView } from "@/features/seo/seo-hub-view";
import { isSeoCategorySlug } from "@/config/seo-taxonomy";

type Props = {
  params: Promise<{
    category: string;
    area?: string;
    facet?: string;
    item?: string;
  }>;
};

function normalizeSegment(value: string | undefined) {
  return value?.toLowerCase() ?? undefined;
}

const resolveSeoHubForRequest = cache(
  (categorySlug: string, areaSlug?: string, facetSlug?: string, itemSlug?: string) =>
    resolveSeoHub({
      categorySlug,
      areaSlug,
      facetSlug,
      itemSlug,
    }),
);

export async function generateSeoHubMetadata({ params }: Props) {
  const raw = await params;
  const category = normalizeSegment(raw.category)!;
  const area = normalizeSegment(raw.area);
  const facet = normalizeSegment(raw.facet);
  const item = normalizeSegment(raw.item);

  if (!isSeoCategorySlug(category)) return {};

  const hub = await resolveSeoHubForRequest(category, area, facet, item);
  if (!hub) return {};

  return buildPageMetadata({
    title: hub.title,
    description: hub.description,
    path: hub.path,
    canonicalPath: hub.canonicalPath,
    noIndex: !hub.indexable,
    follow: true,
  });
}

export async function renderSeoHubPage({ params }: Props) {
  const raw = await params;
  const category = normalizeSegment(raw.category)!;
  const area = normalizeSegment(raw.area);
  const facet = normalizeSegment(raw.facet);
  const item = normalizeSegment(raw.item);

  // Canonicalise casing: /restaurants/Pune → /restaurants/pune
  const desired = ["/" + category, area, facet, item].filter(Boolean).join("/");
  const actual = ["/" + raw.category, raw.area, raw.facet, raw.item]
    .filter(Boolean)
    .join("/");
  if (actual !== desired) {
    permanentRedirect(desired);
  }

  if (!isSeoCategorySlug(category)) notFound();

  const hub = await resolveSeoHubForRequest(category, area, facet, item);
  if (!hub) notFound();

  if (hub.canonicalPath !== hub.path) {
    permanentRedirect(hub.canonicalPath);
  }

  return <SeoHubView hub={hub} />;
}
