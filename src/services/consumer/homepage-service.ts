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
import { hasSupabaseConfig } from "@/config/env";

async function loadHomepageContent(): Promise<HomepageContent> {
  const categories: HomepageContent["categories"] = DEFAULT_CATEGORIES.map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
  }));
  const areas: HomepageContent["areas"] = DEFAULT_AREAS.map((a) => ({
    slug: a.slug,
    name: a.name,
    type: a.type,
  }));

  return {
    popularSearches: [...POPULAR_SEARCHES],
    trendingSearches: [...TRENDING_SEARCHES],
    categories,
    areas,
    popularItems: POPULAR_ITEMS.map((item) => ({
      name: item.name,
      businessCount: 0,
      href: item.href,
      kind: item.kind,
      blurb: item.blurb,
    })),
    dataSource: hasSupabaseConfig() ? "supabase" : "empty",
  };
}

const loadCachedHomepageContent = unstable_cache(
  loadHomepageContent,
  ["homepage-content-v6"],
  { revalidate: PUBLIC_DATA_REVALIDATE_SECONDS, tags: ["homepage", "published-businesses"] },
);

export const getHomepageContent = cache(loadCachedHomepageContent);
