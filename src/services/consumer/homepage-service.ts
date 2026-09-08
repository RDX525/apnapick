import "server-only";

import {
  DEFAULT_AREAS,
  DEFAULT_CATEGORIES,
  POPULAR_ITEMS,
  POPULAR_SEARCHES,
  TRENDING_SEARCHES,
} from "@/config/consumer-content";
import type { HomepageContent } from "@/domain/consumer/types";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { hasSupabaseConfig } from "@/config/env";
import { listPublishedBusinesses } from "@/repositories/consumer/business-repository";

export async function getHomepageContent(): Promise<HomepageContent> {
  const businessesPromise = listPublishedBusinesses(8);

  let categories: HomepageContent["categories"] = DEFAULT_CATEGORIES.map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
  }));
  let areas: HomepageContent["areas"] = DEFAULT_AREAS.map((a) => ({
    slug: a.slug,
    name: a.name,
    type: a.type,
  }));

  if (hasSupabaseConfig()) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const [{ data: cats }, { data: geos }] = await Promise.all([
        supabase
          .from("categories")
          .select("slug, name, description")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("geographic_areas")
          .select("slug, name, area_type")
          .in("area_type", ["suburb", "neighborhood", "city"])
          .order("name", { ascending: true })
          .limit(12),
      ]);

      if (cats && cats.length > 0) {
        categories = cats.map((c) => ({
          slug: c.slug as string,
          name: c.name as string,
          description: (c.description as string | null) ?? null,
        }));
      }
      if (geos && geos.length > 0) {
        areas = geos.map((g) => ({
          slug: g.slug as string,
          name: g.name as string,
          type: g.area_type as string,
        }));
      }
    }
  }

  const { items, source } = await businessesPromise;

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
    popularBusinesses: items,
    popularItems: POPULAR_ITEMS.map((item) => ({
      name: item.name,
      businessCount: 0,
      href: item.href,
      kind: item.kind,
      blurb: item.blurb,
    })),
    dataSource: source,
  };
}
