import type { ConsumerBusinessCard } from "@/domain/consumer/types";
import type { SeoCatalogItem, SeoHubPage, SeoPageType } from "@/domain/seo/types";
import { noIndexReasonForDensity, seoPageMeetsDensity } from "@/config/seo-density";
import {
  SEO_AREA_SLUGS,
  getSeoCategory,
  resolveFacetCanonical,
  titleCaseSlug,
  type SeoCategoryDef,
  type SeoFacetDef,
} from "@/config/seo-taxonomy";
import { PUNE_AREAS } from "@/domain/catalog/lexicon";
import { listBusinessesForSeoHub } from "@/repositories/seo/seo-repository";

function areaLabel(slug: string) {
  return PUNE_AREAS[slug]?.label ?? titleCaseSlug(slug);
}

function matchesTerms(haystack: string, terms: string[]) {
  const h = haystack.toLowerCase();
  return terms.some((t) => h.includes(t.toLowerCase()));
}

function businessText(b: ConsumerBusinessCard) {
  return [
    b.name,
    b.description,
    b.categoryLabel,
    b.matchedItem,
    ...(b.categorySlugs ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filterByArea(businesses: ConsumerBusinessCard[], areaSlug: string) {
  if (areaSlug === "pune") return businesses;
  return businesses.filter((b) => {
    const suburb = b.suburb?.toLowerCase().replace(/\s+/g, "-");
    const city = b.city?.toLowerCase().replace(/\s+/g, "-");
    return suburb === areaSlug || city === areaSlug;
  });
}

function filterByFacet(
  businesses: ConsumerBusinessCard[],
  facet: SeoFacetDef,
  catalog: SeoCatalogItem[],
) {
  return businesses.filter((b) => {
    const text = businessText(b);
    if (matchesTerms(text, facet.matchTerms)) return true;
    return catalog.some(
      (item) =>
        item.kind !== "facet" &&
        matchesTerms(`${b.name} ${b.description ?? ""} ${item.name}`, facet.matchTerms),
    );
  });
}

function filterByItem(
  businesses: ConsumerBusinessCard[],
  matchTerms: string[],
  catalog: SeoCatalogItem[],
) {
  const matchingCatalog = catalog.filter(
    (c) =>
      matchesTerms(c.name, matchTerms) ||
      matchTerms.some((t) => c.slug.includes(t.replace(/\s+/g, "-"))),
  );
  return businesses.filter((b) => {
    const text = businessText(b);
    if (matchesTerms(text, matchTerms)) return true;
    // Prefer businesses that expose matching catalog rows in this area/category pull
    return (
      matchingCatalog.length > 0 &&
      matchesTerms(
        text,
        matchingCatalog.map((c) => c.name),
      )
    );
  });
}

function buildIntro(hub: {
  categoryName: string;
  areaName: string | null;
  facetName: string | null;
  itemName: string | null;
  businessCount: number;
  indexable: boolean;
}) {
  const place = hub.areaName ?? "Pune";
  if (hub.itemName) {
    return hub.indexable
      ? `Explore ${hub.businessCount} places in ${place} known for ${hub.itemName.toLowerCase()}. Real listings only — no placeholder inventory.`
      : `We’re gathering enough verified ${hub.itemName.toLowerCase()} listings in ${place} before this page becomes indexable.`;
  }
  if (hub.facetName) {
    return hub.indexable
      ? `Browse ${hub.facetName.toLowerCase()} ${hub.categoryName.toLowerCase()} in ${place} with live menus, services, and reviews.`
      : `This ${hub.facetName.toLowerCase()} hub stays non-indexable until enough real ${hub.categoryName.toLowerCase()} listings exist in ${place}.`;
  }
  if (hub.areaName) {
    return hub.indexable
      ? `Discover ${hub.businessCount} published ${hub.categoryName.toLowerCase()} in ${place} on ApnaPick.`
      : `Category × area pages only become indexable once enough published ${hub.categoryName.toLowerCase()} are live in ${place}.`;
  }
  return hub.indexable
    ? `Find ${hub.categoryName.toLowerCase()} across Pune — filter by neighbourhood, cuisine, or service intent.`
    : `The ${hub.categoryName} hub indexes only after enough published listings exist citywide.`;
}

function relatedFromCategory(
  category: SeoCategoryDef,
  areaSlug: string | null,
  facet: SeoFacetDef | null,
): SeoHubPage["relatedLinks"] {
  const links: SeoHubPage["relatedLinks"] = [
    { label: category.name, path: `/${category.slug}` },
  ];
  if (areaSlug) {
    links.push({
      label: `${category.name} in ${areaLabel(areaSlug)}`,
      path: `/${category.slug}/${areaSlug}`,
    });
  }
  for (const f of category.facets.slice(0, 6)) {
    if (!areaSlug) continue;
    if (facet && f.slug === facet.slug) continue;
    links.push({
      label: `${f.name} in ${areaLabel(areaSlug)}`,
      path: `/${category.slug}/${areaSlug}/${f.slug}`,
    });
  }
  if (facet && areaSlug) {
    for (const item of facet.items ?? []) {
      links.push({
        label: item.name,
        path: `/${category.slug}/${areaSlug}/${facet.slug}/${item.slug}`,
      });
    }
  }
  return links;
}

export type ResolveSeoHubInput = {
  categorySlug: string;
  areaSlug?: string | null;
  facetSlug?: string | null;
  itemSlug?: string | null;
};

type SeoSupply = Awaited<ReturnType<typeof listBusinessesForSeoHub>>;

/**
 * Resolve a programmatic SEO hub. Unknown taxonomy → null (caller should 404).
 * Thin supply → page still returned with indexable=false.
 */
export async function resolveSeoHub(
  input: ResolveSeoHubInput,
  preloadedSupply?: SeoSupply,
): Promise<SeoHubPage | null> {
  const category = getSeoCategory(input.categorySlug);
  if (!category) return null;

  const areaSlug = input.areaSlug ? input.areaSlug.toLowerCase() : null;
  if (areaSlug && !SEO_AREA_SLUGS.has(areaSlug)) return null;

  let facet: SeoFacetDef | null = null;
  let itemName: string | null = null;
  let itemSlug: string | null = null;
  let canonicalFacetSlug: string | null = null;

  if (input.facetSlug) {
    if (!areaSlug) return null;
    facet = resolveFacetCanonical(category, input.facetSlug.toLowerCase());
    if (!facet) return null;
    canonicalFacetSlug = facet.slug;
    if (input.itemSlug) {
      const item = facet.items?.find((i) => i.slug === input.itemSlug!.toLowerCase());
      if (!item) return null;
      itemSlug = item.slug;
      itemName = item.name;
    }
  } else if (input.itemSlug) {
    return null;
  }

  const pageType: SeoPageType = itemSlug
    ? "category_area_facet_item"
    : facet
      ? "category_area_facet"
      : areaSlug
        ? "category_area"
        : "category";

  const requestedFacet = input.facetSlug?.toLowerCase() ?? null;
  const pathParts = [
    category.slug,
    areaSlug,
    requestedFacet ?? canonicalFacetSlug,
    itemSlug,
  ].filter(Boolean) as string[];
  const path = `/${pathParts.join("/")}`;

  const canonicalPath = `/${[category.slug, areaSlug, canonicalFacetSlug, itemSlug]
    .filter(Boolean)
    .join("/")}`;

  const { businesses: pool, catalogItems: catalogPool } =
    preloadedSupply ?? (await listBusinessesForSeoHub(category.supplyCategorySlugs));

  let businesses = pool;
  if (areaSlug) businesses = filterByArea(businesses, areaSlug);

  let catalogItems: typeof catalogPool = [];
  if (facet && itemSlug) {
    const itemDef = facet.items!.find((i) => i.slug === itemSlug)!;
    catalogItems = catalogPool.filter((c) => matchesTerms(c.name, itemDef.matchTerms));
    businesses = filterByItem(businesses, itemDef.matchTerms, catalogItems);
  } else if (facet) {
    catalogItems = catalogPool.filter(
      (c) =>
        matchesTerms(c.name, facet.matchTerms) ||
        (facet.items ?? []).some((i) => matchesTerms(c.name, i.matchTerms)),
    );
    businesses = filterByFacet(businesses, facet, catalogItems);
  } else {
    catalogItems = catalogPool.slice(0, 24);
  }

  const businessCount = businesses.length;
  const itemCount = Math.max(
    catalogItems.length,
    facet?.items?.length && itemSlug ? 1 : catalogItems.length,
  );
  const indexable = seoPageMeetsDensity(pageType, businessCount, itemCount);
  const noIndex =
    noIndexReasonForDensity(pageType, businessCount, itemCount) ??
    (canonicalPath !== path ? "duplicate_combination" : null);

  const areaName = areaSlug ? areaLabel(areaSlug) : null;
  const titleParts = [
    itemName,
    facet && !itemName ? facet.name : null,
    category.name,
    areaName ? `in ${areaName}` : "in Pune",
  ].filter(Boolean);

  const title = titleParts.join(" ");
  const description = itemName
    ? `Find the best ${itemName.toLowerCase()} from ${category.name.toLowerCase()} in ${areaName ?? "Pune"} on ApnaPick.`
    : facet
      ? `Discover ${facet.name.toLowerCase()} ${category.name.toLowerCase()} in ${areaName ?? "Pune"} — real businesses, menus, and services.`
      : areaName
        ? `Explore ${category.name.toLowerCase()} in ${areaName}. Verified local listings on ApnaPick.`
        : `${category.description}. Browse neighbourhoods and popular intents across Pune.`;

  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: category.name, path: `/${category.slug}` },
  ];
  if (areaSlug && areaName) {
    breadcrumbs.push({
      name: areaName,
      path: `/${category.slug}/${areaSlug}`,
    });
  }
  if (facet && areaSlug) {
    breadcrumbs.push({
      name: facet.name,
      path: `/${category.slug}/${areaSlug}/${facet.slug}`,
    });
  }
  if (itemName && facet && areaSlug && itemSlug) {
    breadcrumbs.push({
      name: itemName,
      path: `/${category.slug}/${areaSlug}/${facet.slug}/${itemSlug}`,
    });
  }

  const hubMeta = {
    categoryName: category.name,
    areaName,
    facetName: facet?.name ?? null,
    itemName,
    businessCount,
    indexable: indexable && noIndex !== "duplicate_combination",
  };

  return {
    path,
    canonicalPath,
    pageType,
    categorySlug: category.slug,
    categoryName: category.name,
    areaSlug,
    areaName,
    facetSlug: canonicalFacetSlug,
    facetName: facet?.name ?? null,
    itemSlug,
    itemName,
    title,
    description,
    h1: title,
    intro: buildIntro(hubMeta),
    indexable: hubMeta.indexable,
    noIndexReason:
      noIndex === "duplicate_combination"
        ? "duplicate_combination"
        : noIndexReasonForDensity(pageType, businessCount, itemCount),
    businessCount,
    itemCount,
    businesses: businesses.slice(0, 40),
    catalogItems: catalogItems.slice(0, 24),
    breadcrumbs,
    relatedLinks: relatedFromCategory(category, areaSlug, facet),
    schemaKind: category.schemaKind,
  };
}

export async function listIndexableSeoPaths(): Promise<
  { path: string; pageType: SeoPageType; priority: number }[]
> {
  const out: { path: string; pageType: SeoPageType; priority: number }[] = [];
  const categories = (await import("@/config/seo-taxonomy")).SEO_CATEGORIES;
  const areas = ["pune", "kharadi", "wagholi", "lohegaon"];
  const supplies = new Map<string, SeoSupply>();

  for (const category of categories) {
    const supplyKey = [...new Set(category.supplyCategorySlugs)].sort().join(",");
    let supply = supplies.get(supplyKey);
    if (!supply) {
      supply = await listBusinessesForSeoHub(category.supplyCategorySlugs);
      supplies.set(supplyKey, supply);
    }
    const catHub = await resolveSeoHub({ categorySlug: category.slug }, supply);
    if (catHub?.indexable) {
      out.push({ path: catHub.canonicalPath, pageType: "category", priority: 0.8 });
    }
    for (const area of areas) {
      const areaHub = await resolveSeoHub(
        {
          categorySlug: category.slug,
          areaSlug: area,
        },
        supply,
      );
      if (areaHub?.indexable) {
        out.push({
          path: areaHub.canonicalPath,
          pageType: "category_area",
          priority: 0.85,
        });
      }
      for (const facet of category.facets) {
        const facetHub = await resolveSeoHub(
          {
            categorySlug: category.slug,
            areaSlug: area,
            facetSlug: facet.slug,
          },
          supply,
        );
        if (facetHub?.indexable) {
          out.push({
            path: facetHub.canonicalPath,
            pageType: "category_area_facet",
            priority: 0.7,
          });
        }
        for (const item of facet.items ?? []) {
          const itemHub = await resolveSeoHub(
            {
              categorySlug: category.slug,
              areaSlug: area,
              facetSlug: facet.slug,
              itemSlug: item.slug,
            },
            supply,
          );
          if (itemHub?.indexable) {
            out.push({
              path: itemHub.canonicalPath,
              pageType: "category_area_facet_item",
              priority: 0.65,
            });
          }
        }
      }
    }
  }

  return out;
}
