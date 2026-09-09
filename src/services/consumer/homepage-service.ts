import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  DEFAULT_AREAS,
  DEFAULT_CATEGORIES,
  POPULAR_ITEMS,
  POPULAR_SEARCHES,
  TRENDING_SEARCHES,
} from "@/config/consumer-content";
import type { HomepageContent } from "@/domain/consumer/types";
import { PUBLIC_DATA_REVALIDATE_SECONDS } from "@/lib/cache/public-data";
import { createPublicSupabaseClient } from "@/lib/db/supabase-public";
import { hasSupabaseConfig } from "@/config/env";
import { listPublishedBusinesses } from "@/repositories/consumer/business-repository";

async function loadHomepageContent(): Promise<HomepageContent> {
  const fallbackCategories: HomepageContent["categories"] = DEFAULT_CATEGORIES.map(
    (c) => ({
      slug: c.slug,
      name: c.name,
      description: c.description,
    }),
  );
  const fallbackAreas: HomepageContent["areas"] = DEFAULT_AREAS.map((a) => ({
    slug: a.slug,
    name: a.name,
    type: a.type,
  }));

  const supabase = hasSupabaseConfig() ? createPublicSupabaseClient() : null;
  const [businessesResult, geos] = await Promise.all([
    listPublishedBusinesses(8),
    supabase
      ? supabase
          .from("geographic_areas")
          .select("slug, name, area_type")
          .in("area_type", ["suburb", "neighborhood", "city"])
          .order("name", { ascending: true })
          .limit(12)
      : Promise.resolve({ data: null }),
  ]);

  const categories = fallbackCategories;
  let areas = fallbackAreas;
  if (geos.data && geos.data.length > 0) {
    areas = geos.data.map((g) => ({
      slug: g.slug as string,
      name: g.name as string,
      type: g.area_type as string,
    }));
  }

  const requiredAreaSlugs = new Set(["wagholi", "kharadi", "lohegaon"]);
  for (const area of DEFAULT_AREAS) {
    if (
      requiredAreaSlugs.has(area.slug) &&
      !areas.some((existing) => existing.slug === area.slug)
    ) {
      areas.push({ slug: area.slug, name: area.name, type: area.type });
    }
  }

  return {
    popularSearches: [...POPULAR_SEARCHES],
    trendingSearches: [...TRENDING_SEARCHES],
    categories,
    areas,
    popularBusinesses: businessesResult.items,
    popularItems: POPULAR_ITEMS.map((item) => ({
      name: item.name,
      businessCount: 0,
      href: item.href,
      kind: item.kind,
      blurb: item.blurb,
    })),
    dataSource: businessesResult.source,
  };
}

const loadCachedHomepageContent = unstable_cache(
  loadHomepageContent,
  ["homepage-content-v4"],
  { revalidate: PUBLIC_DATA_REVALIDATE_SECONDS, tags: ["homepage", "published-businesses"] },
);

export const getHomepageContent = cache(loadCachedHomepageContent);
